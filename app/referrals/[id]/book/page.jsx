import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Booking page — staff/admin only. Phase 4a.
// One scanner, Mon-Fri, 09:00-17:00, 30-minute slots.
// Books the chosen slot for this referral and sets its status to "booked".

export const dynamic = "force-dynamic";

const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;
const SLOT_MINUTES = 30;

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

function addDays(dayStr, n) {
  const d = new Date(dayStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isWeekend(dayStr) {
  const dow = new Date(dayStr + "T12:00:00Z").getUTCDay();
  return dow === 0 || dow === 6;
}

function nextWeekday(dayStr) {
  let d = dayStr;
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

function buildSlotTimes() {
  const times = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return times;
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
          encodeURIComponent("That slot has just been taken. Please pick another.")
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

  // ----- Day + slot data for the picker -----
  const today = londonToday();
  let day = String(sp.day || "").match(/^\d{4}-\d{2}-\d{2}$/)
    ? String(sp.day)
    : nextWeekday(today);
  day = nextWeekday(day);
  const error = sp.error;

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("day, reason")
    .eq("day", day)
    .maybeSingle();

  const slotTimes = buildSlotTimes();
  const slotISOs = slotTimes.map((t) => londonSlotISO(day, t));

  const { data: taken } = await supabase
    .from("appointments")
    .select("starts_at")
    .gte("starts_at", slotISOs[0])
    .lte("starts_at", slotISOs[slotISOs.length - 1])
    .eq("status", "booked");
  const takenSet = new Set((taken || []).map((a) => new Date(a.starts_at).toISOString()));

  const nowISO = new Date().toISOString();
  const prevDay = nextWeekday(addDays(day, -1) === day ? addDays(day, -3) : addDays(day, -1)) === day
    ? addDays(day, -3)
    : addDays(day, -1);
  // Simple prev/next that skip weekends:
  let prev = addDays(day, -1);
  while (isWeekend(prev)) prev = addDays(prev, -1);
  let next = addDays(day, 1);
  while (isWeekend(next)) next = addDays(next, 1);

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
        .bk-daynav{display:flex;align-items:center;justify-content:space-between;gap:12px;
          margin:0 0 18px;}
        .bk-daynav h2{font-family:"Fraunces",Georgia,serif;font-size:19px;margin:0;}
        .bk-arrow{display:inline-block;color:#e7ae3b;text-decoration:none;font-size:14px;
          font-weight:600;border:1px solid rgba(231,174,59,.5);border-radius:999px;
          padding:8px 16px;white-space:nowrap;}
        .bk-arrow:hover{background:rgba(231,174,59,.1);}
        .bk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
        @media(max-width:560px){.bk-grid{grid-template-columns:repeat(2,1fr);}}
        .bk-slot{appearance:none;border:1px solid rgba(247,244,236,.18);background:transparent;
          color:#f7f4ec;font:inherit;font-size:15px;font-weight:600;padding:13px 0;
          border-radius:11px;cursor:pointer;text-align:center;}
        .bk-slot:hover{border-color:#e7ae3b;color:#e7ae3b;}
        .bk-slot:disabled{opacity:.32;cursor:not-allowed;border-color:rgba(247,244,236,.12);}
        .bk-slot:disabled:hover{color:#f7f4ec;}
        .bk-closed{color:rgba(247,244,236,.6);font-size:15px;line-height:1.6;}
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
        ) : (
          <div className="bk-card">
            <div className="bk-daynav">
              <a className="bk-arrow" href={`/referrals/${id}/book?day=${prev}`}>
                &larr; Prev
              </a>
              <h2>{fmtDayLong(day)}</h2>
              <a className="bk-arrow" href={`/referrals/${id}/book?day=${next}`}>
                Next &rarr;
              </a>
            </div>

            {blocked ? (
              <p className="bk-closed">
                The scanning centre is closed this day
                {blocked.reason ? ` (${blocked.reason})` : ""}. Pick another day.
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
                      <input type="hidden" name="day" value={day} />
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
        )}
      </div>
    </main>
  );
}
