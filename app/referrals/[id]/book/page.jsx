import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendAppointmentConfirmation } from "@/lib/emails/send-appointment-confirmation";

// Booking page v3 — month-first picker fed by the scanning diary.
// Opens on a month calendar: days with free slots are gold and clickable,
// everything else is muted. Tap a day to see its times. 30-minute slots.

export const dynamic = "force-dynamic";

const SLOT_MINUTES = 30;
const MONTHS_AHEAD = 6;

const MONTH_NAME = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function one(v) {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

// Convert a London wall-clock time (day "YYYY-MM-DD", time "HH:MM") to a
// correct UTC ISO string, handling BST/GMT automatically.
function londonSlotISO(day, time) {
  for (const off of ["+01:00", "+00:00"]) {
    const d = new Date(`${day}T${time}:00${off}`);
    const shown = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
    if (shown === time) return d.toISOString();
  }
  return new Date(`${day}T${time}:00+00:00`).toISOString();
}

// Today's date in London as "YYYY-MM-DD".
function londonToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date());
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function isWeekend(dayStr) {
  const dow = new Date(dayStr + "T12:00:00Z").getUTCDay();
  return dow === 0 || dow === 6;
}

// "09:00:00" -> minutes since midnight.
function toMinutes(t) {
  const s = String(t || "");
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}

// Build the slot times offered by a day's open sessions.
function buildSlotTimes(sessions) {
  const times = new Set();
  for (const sess of sessions || []) {
    const start = toMinutes(sess.start_time);
    const end = toMinutes(sess.end_time);
    for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      times.add(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  }
  return Array.from(times).sort();
}

function fmtDayLong(dayStr) {
  return new Date(dayStr + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtApptTime(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildMonthCells(year, month) {
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

export default async function BookPage({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) || {};

  const supabase = await createClient();
  const staffId = await requireStaff(supabase);
  if (!staffId) redirect("/dashboard");

  // The referral being booked.
  const { data: ref } = await supabase
    .from("referrals")
    .select(
      "id, status, patients(first_name,last_name), scan_types(name), practices(name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!ref) redirect("/dashboard");

  const patient = one(ref.patients);
  const patientName = patient
    ? `${patient.first_name} ${patient.last_name}`
    : "Patient";
  const scanName = one(ref.scan_types)?.name || "—";
  const practiceName = one(ref.practices)?.name || "—";

  // Existing live appointment for this referral?
  const { data: existing } = await supabase
    .from("appointments")
    .select("id, starts_at, status")
    .eq("referral_id", id)
    .eq("status", "booked")
    .maybeSingle();

  // ----- Server action: book a slot -----
  async function bookSlot(formData) {
    "use server";
    const supabase = await createClient();
    const staffId = await requireStaff(supabase);
    if (!staffId) redirect("/dashboard");

    const slotISO = String(formData.get("slot") || "");
    const day = String(formData.get("day") || "");
    if (!slotISO) redirect(`/referrals/${id}/book`);

    // Refuse a slot someone else just took.
    const { data: clash } = await supabase
      .from("appointments")
      .select("id")
      .eq("starts_at", slotISO)
      .eq("status", "booked")
      .maybeSingle();
    if (clash) {
      redirect(
        `/referrals/${id}/book?day=${day}&error=` +
          encodeURIComponent("That time has just been taken. Please pick another.")
      );
    }

    const { error: insErr } = await supabase.from("appointments").insert({
      referral_id: id,
      starts_at: slotISO,
      booked_by: staffId,
    });
    if (insErr) {
      redirect(
        `/referrals/${id}/book?day=${day}&error=` +
          encodeURIComponent(insErr.message)
      );
    }

    await supabase
      .from("referrals")
      .update({ status: "booked" })
      .eq("id", id)
      .eq("status", "submitted");

    const { data: referralRow } = await supabase
      .from("referrals")
      .select(
        "patient_id, referring_dentist_id, patients(email, first_name, last_name)"
      )
      .eq("id", id)
      .maybeSingle();

    const patient = one(referralRow?.patients);
    let dentistName = null;
    if (referralRow?.referring_dentist_id) {
      const { data: dentist } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", referralRow.referring_dentist_id)
        .maybeSingle();
      dentistName = dentist?.full_name || null;
    }

    if (patient?.email) {
      await sendAppointmentConfirmation({
        to: patient.email,
        startsAtISO: slotISO,
        referralId: id,
        patientFirstName: patient.first_name,
        patientLastName: patient.last_name,
        dentistName,
      });
    }

    revalidatePath("/dashboard");
    redirect(`/referrals/${id}/book`);
  }

  // ----- Server action: cancel the appointment -----
  async function cancelAppointment() {
    "use server";
    const supabase = await createClient();
    const staffId = await requireStaff(supabase);
    if (!staffId) redirect("/dashboard");

    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("referral_id", id)
      .eq("status", "booked");

    await supabase
      .from("referrals")
      .update({ status: "submitted" })
      .eq("id", id)
      .eq("status", "booked");

    revalidatePath("/dashboard");
    redirect(`/referrals/${id}/book`);
  }

  const today = londonToday();
  const nowISO = new Date().toISOString();
  const error = sp.error;

  // Which day (if any) has been picked?
  const pickedDay = String(sp.day || "").match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(sp.day)
    : null;

  // ---------- DAY VIEW data ----------
  let slotTimes = [];
  let slotISOs = [];
  let takenSet = new Set();
  let dayOpen = false;
  if (pickedDay && !existing) {
    const { data: sessions } = await supabase
      .from("open_sessions")
      .select("start_time, end_time")
      .eq("day", pickedDay);
    dayOpen = (sessions || []).length > 0;
    slotTimes = dayOpen ? buildSlotTimes(sessions) : [];
    slotISOs = slotTimes.map((t) => londonSlotISO(pickedDay, t));

    if (slotISOs.length > 0) {
      const { data: taken } = await supabase
        .from("appointments")
        .select("starts_at")
        .gte("starts_at", slotISOs[0])
        .lte("starts_at", slotISOs[slotISOs.length - 1])
        .eq("status", "booked");
      takenSet = new Set((taken || []).map((a) => new Date(a.starts_at).toISOString()));
    }
  }

  // ---------- MONTH VIEW data ----------
  // Clamp the requested month between this month and +6 months.
  const tY = Number(today.slice(0, 4));
  const tM = Number(today.slice(5, 7));
  let mY = tY;
  let mM = tM;
  const mParam = String(sp.month || "").match(/^(\d{4})-(\d{2})$/);
  if (mParam) {
    mY = Number(mParam[1]);
    mM = Number(mParam[2]);
  }
  const monthIndex = (mY - tY) * 12 + (mM - tM);
  const clamped = Math.min(Math.max(monthIndex, 0), MONTHS_AHEAD - 1);
  const cY = tY + Math.floor((tM - 1 + clamped) / 12);
  const cM = ((tM - 1 + clamped) % 12) + 1;

  let freeByDay = {};
  if (!pickedDay && !existing) {
    const monthStart = `${cY}-${pad(cM)}-01`;
    const monthDays = new Date(Date.UTC(cY, cM, 0)).getUTCDate();
    const monthEnd = `${cY}-${pad(cM)}-${pad(monthDays)}`;

    const { data: sessions } = await supabase
      .from("open_sessions")
      .select("day, start_time, end_time")
      .gte("day", monthStart)
      .lte("day", monthEnd);
    const sessByDay = {};
    for (const s of sessions || []) {
      const k = String(s.day);
      if (!sessByDay[k]) sessByDay[k] = [];
      sessByDay[k].push(s);
    }

    const { data: appts } = await supabase
      .from("appointments")
      .select("starts_at")
      .eq("status", "booked")
      .gte("starts_at", monthStart + "T00:00:00Z")
      .lte("starts_at", monthEnd + "T23:59:59Z");
    const takenAll = new Set((appts || []).map((a) => new Date(a.starts_at).toISOString()));

    for (const dayStr of Object.keys(sessByDay)) {
      if (dayStr < today) continue;
      const times = buildSlotTimes(sessByDay[dayStr]);
      let free = 0;
      for (const t of times) {
        const iso = londonSlotISO(dayStr, t);
        if (!takenAll.has(iso) && iso > nowISO) free++;
      }
      if (free > 0) freeByDay[dayStr] = free;
    }
  }

  const prevMonthIdx = clamped - 1;
  const nextMonthIdx = clamped + 1;
  const monthHref = (idx) => {
    const y = tY + Math.floor((tM - 1 + idx) / 12);
    const m = ((tM - 1 + idx) % 12) + 1;
    return `/referrals/${id}/book?month=${y}-${pad(m)}`;
  };

  return (
    <main className="bk-root">
      <style>{`
        .bk-root{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:"DM Sans",system-ui,sans-serif;padding:40px 24px 80px;}
        .bk-inner{max-width:720px;margin:0 auto;}
        .bk-back{display:inline-block;color:rgba(247,244,236,.6);text-decoration:none;
          font-size:14px;margin-bottom:24px;}
        .bk-back:hover{color:#e7ae3b;}
        .bk-h1{font-family:"Fraunces",Georgia,serif;font-size:28px;margin:0 0 6px;}
        .bk-sub{color:rgba(247,244,236,.6);font-size:14.5px;margin:0 0 26px;}
        .bk-card{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.09);
          border-radius:16px;padding:24px 26px;margin-bottom:20px;}
        .bk-error{background:rgba(220,80,80,.15);border:1px solid rgba(220,80,80,.4);
          color:#ffb4b4;border-radius:10px;padding:12px 14px;font-size:14px;margin:0 0 18px;}
        .bk-booked{font-size:16px;line-height:1.6;}
        .bk-booked b{color:#e7ae3b;}
        .bk-cancel{appearance:none;border:1px solid rgba(255,120,120,.45);background:transparent;
          color:#ff9b9b;font:inherit;font-size:14px;font-weight:600;padding:10px 20px;
          border-radius:999px;cursor:pointer;margin-top:18px;}
        .bk-cancel:hover{background:rgba(255,120,120,.1);}
        .bk-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;
          margin:0 0 8px;}
        .bk-nav h2{font-family:"Fraunces",Georgia,serif;font-size:21px;margin:0;}
        .bk-arrow{display:inline-block;color:#e7ae3b;text-decoration:none;font-size:15px;
          font-weight:600;border:1px solid rgba(231,174,59,.5);border-radius:999px;
          padding:10px 20px;white-space:nowrap;}
        .bk-arrow:hover{background:rgba(231,174,59,.1);}
        .bk-arrow.off{visibility:hidden;}
        .bk-hint{color:rgba(247,244,236,.6);font-size:14.5px;margin:0 0 18px;text-align:center;}
        .bk-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}
        .bk-dow{font-size:11px;letter-spacing:.06em;text-transform:uppercase;
          color:rgba(247,244,236,.4);text-align:center;padding-bottom:4px;}
        .bk-cell{min-height:62px;border-radius:11px;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:2px;}
        .bk-cell.muted{border:1px solid rgba(247,244,236,.07);color:rgba(247,244,236,.28);}
        a.bk-cell{background:rgba(231,174,59,.22);border:1px solid rgba(231,174,59,.55);
          color:#f7f4ec;text-decoration:none;font-weight:600;}
        a.bk-cell:hover{background:rgba(231,174,59,.4);}
        .bk-cell .n{font-size:16px;line-height:1.1;}
        .bk-cell .f{font-size:10.5px;color:#e7ae3b;font-weight:700;line-height:1.1;}
        a.bk-cell:hover .f{color:#fff;}
        .bk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
        @media(max-width:560px){.bk-grid{grid-template-columns:repeat(2,1fr);}
          .bk-cell{min-height:54px;}}
        .bk-slot{appearance:none;border:1px solid rgba(247,244,236,.18);background:transparent;
          color:#f7f4ec;font:inherit;font-size:15px;font-weight:600;padding:13px 0;
          border-radius:11px;cursor:pointer;text-align:center;}
        .bk-slot:hover{border-color:#e7ae3b;color:#e7ae3b;}
        .bk-slot:disabled{opacity:.32;cursor:not-allowed;border-color:rgba(247,244,236,.12);}
        .bk-slot:disabled:hover{color:#f7f4ec;}
        .bk-closed{color:rgba(247,244,236,.6);font-size:15px;line-height:1.6;}
        .bk-closed a{color:#e7ae3b;font-weight:600;}
        .bk-tomonth{display:inline-block;color:#e7ae3b;text-decoration:none;font-size:14px;
          font-weight:600;margin-bottom:14px;}
        .bk-tomonth:hover{text-decoration:underline;}
      `}</style>

      <div className="bk-inner">
        <a className="bk-back" href={"/referrals/" + id}>
          &larr; Back to referral
        </a>

        <h1 className="bk-h1">Book appointment</h1>
        <p className="bk-sub">
          {patientName} &middot; {scanName} &middot; {practiceName}
        </p>

        {error && <p className="bk-error">{error}</p>}

        {existing ? (
          <div className="bk-card">
            <p className="bk-booked">
              This patient is booked in for
              <br />
              <b>{fmtApptTime(existing.starts_at)}</b>
            </p>
            <form action={cancelAppointment}>
              <button className="bk-cancel" type="submit">
                Cancel this appointment
              </button>
            </form>
          </div>
        ) : pickedDay ? (
          /* ---------- DAY VIEW ---------- */
          <div className="bk-card">
            <a className="bk-tomonth" href={`/referrals/${id}/book?month=${pickedDay.slice(0, 7)}`}>
              &larr; Back to calendar
            </a>
            <div className="bk-nav">
              <span></span>
              <h2>{fmtDayLong(pickedDay)}</h2>
              <span></span>
            </div>
            <p className="bk-hint">Pick a time below.</p>

            {!dayOpen ? (
              <p className="bk-closed">
                The scanning centre isn&rsquo;t open this day. Go back to the calendar,
                or open it in the <a href="/diary">Scanning schedule</a> first.
              </p>
            ) : (
              <div className="bk-grid">
                {slotTimes.map((t, i) => {
                  const iso = slotISOs[i];
                  const isTaken = takenSet.has(iso);
                  const isPast = iso <= nowISO;
                  return (
                    <form key={t} action={bookSlot} style={{ display: "contents" }}>
                      <input type="hidden" name="slot" value={iso} />
                      <input type="hidden" name="day" value={pickedDay} />
                      <button
                        className="bk-slot"
                        type="submit"
                        disabled={isTaken || isPast}
                        title={isTaken ? "Already booked" : isPast ? "In the past" : "Book " + t}
                      >
                        {t}
                      </button>
                    </form>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ---------- MONTH VIEW ---------- */
          <div className="bk-card">
            <div className="bk-nav">
              <a className={"bk-arrow" + (prevMonthIdx < 0 ? " off" : "")} href={prevMonthIdx >= 0 ? monthHref(prevMonthIdx) : "#"}>
                &larr; Back
              </a>
              <h2>{MONTH_NAME[cM - 1]} {cY}</h2>
              <a className={"bk-arrow" + (nextMonthIdx >= MONTHS_AHEAD ? " off" : "")} href={nextMonthIdx < MONTHS_AHEAD ? monthHref(nextMonthIdx) : "#"}>
                Next month &rarr;
              </a>
            </div>
            <p className="bk-hint">Gold days have appointments free &mdash; tap one to pick a time.</p>

            <div className="bk-cal">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                <span className="bk-dow" key={d}>{d}</span>
              ))}
              {buildMonthCells(cY, cM).map((dayStr, i) => {
                if (!dayStr) return <span className="bk-cell muted" key={"b" + i} style={{ border: "none" }}></span>;

                const free = freeByDay[dayStr] || 0;
                const dayNum = Number(dayStr.slice(8, 10));

                if (free > 0) {
                  return (
                    <a className="bk-cell" key={dayStr} href={`/referrals/${id}/book?day=${dayStr}`}>
                      <span className="n">{dayNum}</span>
                      <span className="f">{free} free</span>
                    </a>
                  );
                }

                return (
                  <span className="bk-cell muted" key={dayStr}>
                    <span className="n">{dayNum}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
