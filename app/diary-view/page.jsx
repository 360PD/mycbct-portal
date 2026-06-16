import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DiaryDnaButton from "@/components/DiaryDnaButton";

// Staff/admin read-only diary — month overview and day appointment list.

export const dynamic = "force-dynamic";

const MONTHS_AHEAD = 3;

const MONTH_NAME = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function one(v) {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

function londonDayOf(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date(iso));
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDayLong(dayStr) {
  return new Date(dayStr + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function notesSnippet(text, max = 120) {
  const s = String(text || "").trim();
  if (!s) return "—";
  if (s.length <= max) return s;
  return s.slice(0, max).trimEnd() + "…";
}

function buildMonthCells(year, month) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lead = (firstDow + 6) % 7;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${pad(month)}-${pad(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
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

export default async function DiaryViewPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const supabase = await createClient();
  const staffId = await requireStaff(supabase);
  if (!staffId) redirect("/dashboard");

  const today = londonToday();
  const [tYear, tMonth] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];

  const months = [];
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const m = tMonth - 1 + i;
    months.push({ year: tYear + Math.floor(m / 12), month: (m % 12) + 1 });
  }
  const rangeStart = `${months[0].year}-${pad(months[0].month)}-01`;
  const last = months[months.length - 1];
  const lastDayNum = new Date(Date.UTC(last.year, last.month, 0)).getUTCDate();
  const rangeEnd = `${last.year}-${pad(last.month)}-${pad(lastDayNum)}`;

  const [{ data: sessions }, { data: appts }] = await Promise.all([
    supabase
      .from("open_sessions")
      .select("day")
      .gte("day", rangeStart)
      .lte("day", rangeEnd),
    supabase
      .from("appointments")
      .select(
        "id, starts_at, referral_id, " +
          "referrals(id, clinical_notes, referring_dentist_id, " +
          "patients(first_name, last_name, date_of_birth), scan_types(name))"
      )
      .eq("status", "booked")
      .gte("starts_at", rangeStart + "T00:00:00Z")
      .lte("starts_at", rangeEnd + "T23:59:59Z")
      .order("starts_at", { ascending: true }),
  ]);

  const openDays = new Set((sessions || []).map((s) => String(s.day)));

  const dentistIds = new Set();
  for (const a of appts || []) {
    const ref = one(a.referrals);
    if (ref?.referring_dentist_id) dentistIds.add(ref.referring_dentist_id);
  }
  const dentistById = {};
  if (dentistIds.size > 0) {
    const { data: dentists } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", Array.from(dentistIds));
    for (const d of dentists || []) {
      dentistById[d.id] = d.full_name || "—";
    }
  }

  const bookings = {};
  const apptsByDay = {};
  for (const a of appts || []) {
    const day = londonDayOf(a.starts_at);
    bookings[day] = (bookings[day] || 0) + 1;

    const ref = one(a.referrals);
    const patient = one(ref?.patients);
    const scanType = one(ref?.scan_types);
    const patientName = patient
      ? [patient.first_name, patient.last_name].filter(Boolean).join(" ")
      : "Patient";

    const card = {
      id: a.id,
      startsAt: a.starts_at,
      time: fmtTime(a.starts_at),
      referralId: ref?.id || a.referral_id,
      patientName,
      scanType: scanType?.name || "—",
      dentistName: ref?.referring_dentist_id
        ? dentistById[ref.referring_dentist_id] || "—"
        : "—",
      dob: patient?.date_of_birth ? fmtDate(patient.date_of_birth) : "—",
      notesSnippet: notesSnippet(ref?.clinical_notes),
    };

    if (!apptsByDay[day]) apptsByDay[day] = [];
    apptsByDay[day].push(card);
  }

  const pickedDay = String(sp.day || "").match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(sp.day)
    : null;
  const dayAppts = pickedDay ? apptsByDay[pickedDay] || [] : [];

  return (
    <main className="dv">
      <div className="dv-inner">
        <a className="dv-back" href="/dashboard">&larr; Back to dashboard</a>

        <h1 className="dv-h1">Diary</h1>
        <p className="dv-sub">
          {pickedDay
            ? "Appointments for the selected day."
            : "Open days are highlighted in gold. Click a day to see who is booked in."}
        </p>

        {pickedDay ? (
          <section className="dv-card">
            <a className="dv-tocal" href="/diary-view">&larr; Back to calendar</a>
            <h2 className="dv-h2">{fmtDayLong(pickedDay)}</h2>

            {dayAppts.length === 0 ? (
              <p className="dv-empty">No booked appointments on this day.</p>
            ) : (
              <ul className="dv-appts">
                {dayAppts.map((appt) => (
                  <li className="dv-appt-row" key={appt.id}>
                    <a className="dv-appt-card" href={"/referrals/" + appt.referralId}>
                      <span className="dv-appt-time">{appt.time}</span>
                      <span className="dv-appt-main">
                        <span className="dv-appt-name">{appt.patientName}</span>
                        <span className="dv-appt-meta">
                          {appt.scanType} &middot; {appt.dentistName}
                        </span>
                      </span>
                      <span className="dv-appt-hover">
                        <span>DOB: {appt.dob}</span>
                        <span>{appt.notesSnippet}</span>
                      </span>
                    </a>
                    <DiaryDnaButton appointmentId={appt.id} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <div className="dv-months">
            {months.map(({ year, month }) => (
              <section className="dv-month" key={year + "-" + month}>
                <h2 className="dv-month-name">{MONTH_NAME[month - 1]} {year}</h2>
                <div className="dv-grid">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <span className="dv-dow" key={d}>{d}</span>
                  ))}
                  {buildMonthCells(year, month).map((dayStr, i) => {
                    if (!dayStr) return <span className="dv-blank" key={"b" + i}></span>;

                    const open = openDays.has(dayStr);
                    const count = bookings[dayStr] || 0;
                    const dayNum = Number(dayStr.slice(8, 10));
                    const cls =
                      "dv-day" +
                      (open ? " open" : " closed") +
                      (dayStr === today ? " today" : "");

                    return (
                      <a className={cls} key={dayStr} href={"/diary-view?day=" + dayStr}>
                        <span className="dv-day-inner">
                          <span className="dv-num">{dayNum}</span>
                          {count > 0 ? (
                            <span className="dv-count">{count} booked</span>
                          ) : open ? (
                            <span className="dv-count">Open</span>
                          ) : null}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .dv{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          padding:40px 24px 80px;}
        .dv-inner{max-width:1040px;margin:0 auto;}
        .dv-back{display:inline-block;color:rgba(247,244,236,.6);text-decoration:none;
          font-size:14px;margin-bottom:24px;}
        .dv-back:hover{color:#e7ae3b;}
        .dv-h1{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:30px;margin:0 0 10px;}
        .dv-sub{color:rgba(247,244,236,.6);font-size:14.5px;line-height:1.6;margin:0 0 26px;max-width:640px;}
        .dv-card{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:24px 26px;margin-bottom:22px;}
        .dv-h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:20px;margin:0 0 18px;}
        .dv-tocal{display:inline-block;color:#e7ae3b;text-decoration:none;font-size:14px;
          font-weight:600;margin-bottom:14px;}
        .dv-tocal:hover{text-decoration:underline;}
        .dv-empty{color:rgba(247,244,236,.5);font-size:15px;margin:0;}
        .dv-months{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:26px;}
        .dv-month{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:20px;}
        .dv-month-name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;
          margin:0 0 14px;}
        .dv-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
        .dv-dow{font-size:11px;letter-spacing:.06em;text-transform:uppercase;
          color:rgba(247,244,236,.4);text-align:center;padding-bottom:4px;}
        .dv-blank{min-height:52px;}
        .dv-day{text-decoration:none;border:1px solid rgba(247,244,236,.12);
          border-radius:9px;min-height:52px;padding:5px 3px;text-align:center;display:block;}
        .dv-day.closed{background:rgba(247,244,236,.03);color:rgba(247,244,236,.35);
          border-color:rgba(247,244,236,.08);}
        .dv-day.open{background:rgba(231,174,59,.28);border-color:rgba(231,174,59,.55);color:#f7f4ec;}
        .dv-day.open:hover{border-color:#e7ae3b;background:rgba(231,174,59,.4);}
        .dv-day.today{outline:2px solid rgba(247,244,236,.5);outline-offset:1px;}
        .dv-day-inner{display:flex;flex-direction:column;gap:1px;align-items:center;}
        .dv-num{font-size:14px;font-weight:600;line-height:1.2;}
        .dv-count{font-size:10px;line-height:1.2;color:rgba(247,244,236,.8);}
        .dv-day.closed .dv-count{color:rgba(247,244,236,.45);}
        .dv-appts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;}
        .dv-appt-row{display:flex;align-items:stretch;gap:10px;}
        .dv-appt-card{position:relative;flex:1;display:flex;align-items:center;gap:16px;
          background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:13px;padding:14px 18px;text-decoration:none;color:#f7f4ec;
          transition:border-color .15s ease,background .15s ease;}
        .dv-appt-card:hover{border-color:rgba(231,174,59,.5);background:rgba(231,174,59,.08);}
        .dv-appt-time{flex:none;font-size:15px;font-weight:700;color:#e7ae3b;min-width:52px;}
        .dv-appt-main{display:flex;flex-direction:column;gap:3px;min-width:0;}
        .dv-appt-name{font-size:15px;font-weight:600;}
        .dv-appt-meta{font-size:13px;color:rgba(247,244,236,.55);}
        .dv-appt-hover{display:none;position:absolute;left:18px;right:18px;bottom:calc(100% + 8px);
          background:#152438;border:1px solid rgba(231,174,59,.35);border-radius:10px;
          padding:10px 12px;font-size:13px;line-height:1.5;color:rgba(247,244,236,.85);
          flex-direction:column;gap:4px;z-index:2;box-shadow:0 8px 24px rgba(0,0,0,.35);}
        .dv-appt-card:hover .dv-appt-hover{display:flex;}
        .dv-dna{flex:none;align-self:center;appearance:none;cursor:pointer;
          font:inherit;font-size:13px;font-weight:700;letter-spacing:.04em;
          color:#ff9b9b;background:transparent;border:1px solid rgba(255,120,120,.55);
          border-radius:8px;padding:10px 14px;transition:background .15s ease;}
        .dv-dna:hover{background:rgba(255,120,120,.12);}
        @media(max-width:560px){
          .dv-months{grid-template-columns:1fr;}
          .dv-appt-row{flex-direction:column;}
          .dv-dna{align-self:flex-end;}
        }
      `}</style>
    </main>
  );
}
