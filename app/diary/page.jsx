import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Diary — staff/admin only. Phase 4a availability.
// Six months of calendars. Click a weekday to cycle:
// Closed -> AM (09:00-13:00) -> PM (13:00-17:00) -> Full (09:00-17:00) -> Closed.
// Closing a day does NOT cancel bookings already on it.

export const dynamic = "force-dynamic";

const MONTHS_AHEAD = 6;

const PRESETS = {
  am: { label: "AM", start: "09:00", end: "13:00" },
  pm: { label: "PM", start: "13:00", end: "17:00" },
  full: { label: "Full day", start: "09:00", end: "17:00" },
};

// Today's date in London as "YYYY-MM-DD".
function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

// London calendar date of a timestamptz, as "YYYY-MM-DD".
function londonDayOf(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function isWeekend(dayStr) {
  const dow = new Date(dayStr + "T12:00:00Z").getUTCDay();
  return dow === 0 || dow === 6;
}

// What state is this day in, given its open_sessions rows?
function dayState(rows) {
  if (!rows || rows.length === 0) return "closed";
  if (rows.length === 1) {
    const s = String(rows[0].start_time || "").slice(0, 5);
    const e = String(rows[0].end_time || "").slice(0, 5);
    if (s === "09:00" && e === "13:00") return "am";
    if (s === "13:00" && e === "17:00") return "pm";
    if (s === "09:00" && e === "17:00") return "full";
  }
  return "custom";
}

const NEXT_STATE = { closed: "am", am: "pm", pm: "full", full: "closed", custom: "closed" };

const STATE_LABEL = { closed: "", am: "AM", pm: "PM", full: "Full", custom: "Open" };

async function requireStaff(supabase) {
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();
  const role = me?.role;
  if (role !== "staff" && role !== "admin") return null;
  return claims.sub;
}

export default async function DiaryPage() {
  const supabase = await createClient();
  const staffId = await requireStaff(supabase);
  if (!staffId) redirect("/dashboard");

  const today = londonToday();
  const [tYear, tMonth] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];

  // The six months we show, as {year, month} (month 1-12).
  const months = [];
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const m = tMonth - 1 + i;
    months.push({ year: tYear + Math.floor(m / 12), month: (m % 12) + 1 });
  }
  const rangeStart = `${months[0].year}-${pad(months[0].month)}-01`;
  const last = months[months.length - 1];
  const lastDayNum = new Date(Date.UTC(last.year, last.month, 0)).getUTCDate();
  const rangeEnd = `${last.year}-${pad(last.month)}-${pad(lastDayNum)}`;

  // All open sessions in range.
  const { data: sessions } = await supabase
    .from("open_sessions")
    .select("day, start_time, end_time")
    .gte("day", rangeStart)
    .lte("day", rangeEnd);
  const sessionsByDay = {};
  for (const row of sessions || []) {
    const k = String(row.day);
    if (!sessionsByDay[k]) sessionsByDay[k] = [];
    sessionsByDay[k].push(row);
  }

  // Booked appointment counts per London day in range.
  const { data: appts } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("status", "booked")
    .gte("starts_at", rangeStart + "T00:00:00Z")
    .lte("starts_at", rangeEnd + "T23:59:59Z");
  const bookingsByDay = {};
  for (const a of appts || []) {
    const k = londonDayOf(a.starts_at);
    bookingsByDay[k] = (bookingsByDay[k] || 0) + 1;
  }

  // ----- Server action: cycle a day's state -----
  async function cycleDay(formData) {
    "use server";
    const supabase = await createClient();
    const staffId = await requireStaff(supabase);
    if (!staffId) redirect("/dashboard");

    const day = String(formData.get("day") || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) redirect("/diary");
    if (isWeekend(day)) redirect("/diary");
    if (day < londonToday()) redirect("/diary");

    const { data: rows } = await supabase
      .from("open_sessions")
      .select("day, start_time, end_time")
      .eq("day", day);

    const next = NEXT_STATE[dayState(rows)] || "closed";

    await supabase.from("open_sessions").delete().eq("day", day);
    if (next !== "closed") {
      const p = PRESETS[next];
      await supabase.from("open_sessions").insert({
        day,
        start_time: p.start,
        end_time: p.end,
        created_by: staffId,
      });
    }

    revalidatePath("/diary");
    redirect("/diary");
  }

  // ----- Build calendar grids -----
  const MONTH_NAME = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function buildMonth(year, month) {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
    const lead = (firstDow + 6) % 7; // blanks before day 1, Monday-start
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${pad(month)}-${pad(d)}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  return (
    <main className="dy-root">
      <div className="dy-inner">
        <a className="dy-back" href="/dashboard">&larr; Back to dashboard</a>

        <h1 className="dy-h1">Scanning diary</h1>
        <p className="dy-sub">
          Click a day to change it: Closed &rarr; AM (9&ndash;1) &rarr; PM (1&ndash;5) &rarr; Full day (9&ndash;5) &rarr; Closed.
          Days are closed unless you open them. Closing a day does not cancel bookings already on it.
        </p>

        <div className="dy-key">
          <span className="dy-key-item"><span className="dy-swatch closed"></span>Closed</span>
          <span className="dy-key-item"><span className="dy-swatch am"></span>AM</span>
          <span className="dy-key-item"><span className="dy-swatch pm"></span>PM</span>
          <span className="dy-key-item"><span className="dy-swatch full"></span>Full day</span>
        </div>

        <div className="dy-months">
          {months.map(({ year, month }) => (
            <section className="dy-month" key={year + "-" + month}>
              <h2 className="dy-month-name">{MONTH_NAME[month - 1]} {year}</h2>
              <div className="dy-grid">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                  <span className="dy-dow" key={d}>{d}</span>
                ))}
                {buildMonth(year, month).map((dayStr, i) => {
                  if (!dayStr) return <span className="dy-blank" key={"b" + i}></span>;

                  const weekend = isWeekend(dayStr);
                  const past = dayStr < today;
                  const state = dayState(sessionsByDay[dayStr]);
                  const count = bookingsByDay[dayStr] || 0;
                  const dayNum = Number(dayStr.slice(8, 10));
                  const locked = weekend || past;

                  const cls =
                    "dy-day " + state +
                    (locked ? " locked" : "") +
                    (dayStr === today ? " today" : "");

                  const inner = (
                    <span className="dy-day-inner">
                      <span className="dy-num">{dayNum}</span>
                      <span className="dy-state">{STATE_LABEL[state]}</span>
                      {count > 0 ? <span className="dy-count">{count} booked</span> : null}
                    </span>
                  );

                  if (locked) {
                    return <span className={cls} key={dayStr}>{inner}</span>;
                  }

                  return (
                    <form action={cycleDay} key={dayStr} style={{ display: "contents" }}>
                      <input type="hidden" name="day" value={dayStr} />
                      <button className={cls} type="submit" title={"Change " + dayStr}>{inner}</button>
                    </form>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <style>{`
        .dy-root{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          padding:40px 24px 80px;}
        .dy-inner{max-width:1040px;margin:0 auto;}
        .dy-back{display:inline-block;color:rgba(247,244,236,.6);text-decoration:none;
          font-size:14px;margin-bottom:24px;}
        .dy-back:hover{color:#e7ae3b;}
        .dy-h1{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:30px;margin:0 0 10px;}
        .dy-sub{color:rgba(247,244,236,.6);font-size:14.5px;line-height:1.6;margin:0 0 18px;max-width:640px;}
        .dy-key{display:flex;gap:18px;flex-wrap:wrap;margin:0 0 26px;font-size:13px;
          color:rgba(247,244,236,.7);}
        .dy-key-item{display:flex;align-items:center;gap:7px;}
        .dy-swatch{width:14px;height:14px;border-radius:4px;display:inline-block;}
        .dy-swatch.closed{background:rgba(247,244,236,.08);border:1px solid rgba(247,244,236,.18);}
        .dy-swatch.am{background:rgba(231,174,59,.25);}
        .dy-swatch.pm{background:rgba(231,174,59,.45);}
        .dy-swatch.full{background:#e7ae3b;}
        .dy-months{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:26px;}
        .dy-month{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:20px;}
        .dy-month-name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;
          margin:0 0 14px;}
        .dy-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
        .dy-dow{font-size:11px;letter-spacing:.06em;text-transform:uppercase;
          color:rgba(247,244,236,.4);text-align:center;padding-bottom:4px;}
        .dy-blank{min-height:52px;}
        .dy-day{appearance:none;border:1px solid rgba(247,244,236,.12);background:rgba(247,244,236,.03);
          color:#f7f4ec;font:inherit;border-radius:9px;min-height:52px;padding:5px 3px;
          cursor:pointer;text-align:center;display:block;width:100%;}
        .dy-day:hover{border-color:#e7ae3b;}
        .dy-day.am{background:rgba(231,174,59,.18);border-color:rgba(231,174,59,.4);}
        .dy-day.pm{background:rgba(231,174,59,.32);border-color:rgba(231,174,59,.55);}
        .dy-day.full{background:rgba(231,174,59,.55);border-color:#e7ae3b;}
        .dy-day.full .dy-num,.dy-day.full .dy-state{color:#10131a;}
        .dy-day.custom{background:rgba(120,200,160,.2);border-color:rgba(120,200,160,.45);}
        .dy-day.locked{opacity:.3;cursor:default;pointer-events:none;}
        .dy-day.today{outline:2px solid rgba(247,244,236,.5);outline-offset:1px;}
        .dy-day-inner{display:flex;flex-direction:column;gap:1px;align-items:center;}
        .dy-num{font-size:14px;font-weight:600;line-height:1.2;}
        .dy-state{font-size:10px;letter-spacing:.05em;text-transform:uppercase;
          color:#e7ae3b;font-weight:700;min-height:12px;line-height:1.2;}
        .dy-count{font-size:10px;color:rgba(247,244,236,.75);line-height:1.2;}
        .dy-day.full .dy-count{color:#10131a;}
        @media(max-width:560px){.dy-months{grid-template-columns:1fr;}}
      `}</style>
    </main>
  );
}
