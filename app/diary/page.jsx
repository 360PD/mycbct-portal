import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiaryCalendar from "@/components/DiaryCalendar";

// Diary page v2 — staff/admin only. Instant clicks, no page flash.
// Loads six months of availability + booking counts, then hands the
// calendar to a client component. Saves happen through the saveDay
// server action below.

export const dynamic = "force-dynamic";

const MONTHS_AHEAD = 6;

const PRESETS = {
  am: { start: "09:00", end: "13:00" },
  pm: { start: "13:00", end: "17:00" },
  full: { start: "09:00", end: "17:00" },
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

  // All open sessions in range, folded down to one state per day.
  const { data: sessions } = await supabase
    .from("open_sessions")
    .select("day, start_time, end_time")
    .gte("day", rangeStart)
    .lte("day", rangeEnd);
  const rowsByDay = {};
  for (const row of sessions || []) {
    const k = String(row.day);
    if (!rowsByDay[k]) rowsByDay[k] = [];
    rowsByDay[k].push(row);
  }
  const initialStates = {};
  for (const k of Object.keys(rowsByDay)) {
    initialStates[k] = dayState(rowsByDay[k]);
  }

  // Booked appointment counts per London day in range.
  const { data: appts } = await supabase
    .from("appointments")
    .select("starts_at")
    .eq("status", "booked")
    .gte("starts_at", rangeStart + "T00:00:00Z")
    .lte("starts_at", rangeEnd + "T23:59:59Z");
  const bookings = {};
  for (const a of appts || []) {
    const k = londonDayOf(a.starts_at);
    bookings[k] = (bookings[k] || 0) + 1;
  }

  // ----- Server action: set one day to one state -----
  async function saveDay(day, state) {
    "use server";
    const supabase = await createClient();
    const staffId = await requireStaff(supabase);
    if (!staffId) return { error: "Not signed in as staff" };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) return { error: "Bad date" };
    if (isWeekend(day)) return { error: "Weekends stay closed" };
    if (day < londonToday()) return { error: "That day is in the past" };
    if (!["closed", "am", "pm", "full"].includes(state)) return { error: "Bad state" };

    const { error: delErr } = await supabase.from("open_sessions").delete().eq("day", day);
    if (delErr) return { error: delErr.message };

    if (state !== "closed") {
      const p = PRESETS[state];
      const { error: insErr } = await supabase.from("open_sessions").insert({
        day,
        start_time: p.start,
        end_time: p.end,
        created_by: staffId,
      });
      if (insErr) return { error: insErr.message };
    }

    return { ok: true };
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

        <DiaryCalendar
          months={months}
          initialStates={initialStates}
          bookings={bookings}
          today={today}
          saveDay={saveDay}
        />
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
      `}</style>
    </main>
  );
}
