// v1 — the patient's own booking page. No login, no account, one screen.
//
// Reached from the link in the "your dentist has referred you" email, sent
// when a dentist refers but asks us to contact the patient. Built for people
// who are older, nervous about the scan, and not especially comfortable with
// websites: cream background and dark text rather than the dark portal theme,
// large type, appointment times as big buttons, and the phone number in front
// of them the whole way.
//
// The token is REUSABLE until it expires — mail filters open links to check
// them, and a single-use token would be spent before the patient clicked it.
//
// Everything is re-derived from the token inside the server action. The only
// thing taken from the form is which slot they picked.

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildSlotTimes,
  fmtDayFriendly,
  fmtTimeFriendly,
  londonSlotISO,
  londonToday,
} from "@/lib/slots";
import { sendAppointmentConfirmation } from "@/lib/emails/send-appointment-confirmation";

export const dynamic = "force-dynamic";

const WEEKS_AHEAD = 8;
const MAX_SLOTS_SHOWN = 15;

const ADDRESS_LINES = [
  "360 Visualise",
  "Octagon House",
  "Bradford Road, Sandbeds",
  "West Yorkshire BD20 5LY",
];
const PHONE = "01943 601222";
const PHONE_TEL = "01943601222";
const WHAT3WORDS = "///half.river.surpassed";
const DIRECTIONS_URL =
  "https://www.google.com/maps/place/360+Visualise/data=!4m2!3m1!1s0x0:0x9d119d3ce060fd51?sa=X&ved=1t:2428&ictx=111";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function one(v) {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function money(pence) {
  if (pence === null || pence === undefined) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(pence) / 100);
}

function addDays(dayStr, n) {
  const d = new Date(dayStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Look the token up and gather everything the page needs.
async function loadBooking(token) {
  const db = admin();
  if (!db) return { error: "unavailable" };

  const { data: row } = await db
    .from("patient_booking_tokens")
    .select("token, referral_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!row) return { error: "not-found" };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { error: "expired" };
  }

  const { data: ref } = await db
    .from("referrals")
    .select(
      "id, status, archived, scan_fee_pence, report_fee_pence, report_requested, " +
        "patients(first_name, last_name, email), scan_types(name, base_price, report_price_pence)"
    )
    .eq("id", row.referral_id)
    .maybeSingle();

  if (!ref || ref.archived) return { error: "not-found" };

  const patient = one(ref.patients);
  const scanType = one(ref.scan_types);

  const { data: appt } = await db
    .from("appointments")
    .select("id, starts_at, status")
    .eq("referral_id", ref.id)
    .eq("status", "booked")
    .maybeSingle();

  return { db, token: row.token, ref, patient, scanType, appt };
}

// The next handful of free slots, soonest first.
async function loadFreeSlots(db) {
  const today = londonToday();
  const until = addDays(today, WEEKS_AHEAD * 7);

  const { data: sessions } = await db
    .from("open_sessions")
    .select("day, start_time, end_time")
    .gte("day", today)
    .lte("day", until)
    .order("day");

  const byDay = {};
  for (const s of sessions || []) {
    const k = String(s.day);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(s);
  }

  const { data: taken } = await db
    .from("booked_slot_times")
    .select("starts_at");
  const takenSet = new Set(
    (taken || []).map((t) => new Date(t.starts_at).toISOString())
  );

  const nowMs = Date.now();
  const out = [];
  for (const day of Object.keys(byDay).sort()) {
    for (const time of buildSlotTimes(byDay[day])) {
      const iso = londonSlotISO(day, time);
      if (takenSet.has(iso)) continue;
      // Don't offer a slot that's already been and gone today.
      if (new Date(iso).getTime() <= nowMs) continue;
      out.push({ day, iso });
      if (out.length >= MAX_SLOTS_SHOWN) return out;
    }
  }
  return out;
}

export default async function PatientBookPage({ params, searchParams }) {
  const { token } = await params;
  const sp = (await searchParams) || {};
  const errorNote = sp.error ? String(sp.error) : "";

  const loaded = await loadBooking(token);

  if (loaded.error) {
    const title =
      loaded.error === "expired"
        ? "This booking link has expired"
        : loaded.error === "unavailable"
          ? "Booking is temporarily unavailable"
          : "We couldn't find that booking link";
    return (
      <Shell>
        <h1 className="pb-h1">{title}</h1>
        <p className="pb-lead">
          Please give us a ring and we&rsquo;ll book your scan over the phone.
          It only takes a minute.
        </p>
        <CallBox />
      </Shell>
    );
  }

  const { db, ref, patient, scanType, appt } = loaded;

  // Record that somebody opened it — useful when chasing.
  await db
    .from("patient_booking_tokens")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("token", token);

  const firstName = patient?.first_name || "there";

  const scanFee = ref.scan_fee_pence ?? scanType?.base_price ?? null;
  const reportFee = ref.report_requested
    ? (ref.report_fee_pence ?? scanType?.report_price_pence ?? null)
    : null;
  const total =
    scanFee === null && reportFee === null
      ? null
      : (scanFee || 0) + (reportFee || 0);

  // ---------- Already booked ----------
  if (appt) {
    return (
      <Shell>
        <p className="pb-eyebrow">Your scan is booked</p>
        <h1 className="pb-h1">
          {fmtDayFriendly(new Date(appt.starts_at).toISOString().slice(0, 10))}
          <br />
          at {fmtTimeFriendly(appt.starts_at)}
        </h1>
        <p className="pb-lead">
          Thank you, {firstName}. We look forward to seeing you.
        </p>
        <WhereBox />
        <PrepBox />
        <FeeBox scanFee={scanFee} reportFee={reportFee} total={total} />
        <p className="pb-lead">
          Need to change or cancel? Please ring us as early as you can so we can
          offer the time to somebody else.
        </p>
        <CallBox />
      </Shell>
    );
  }

  const slots = await loadFreeSlots(db);

  // ---------- Server action: take the slot ----------
  async function takeSlot(formData) {
    "use server";

    const picked = String(formData.get("slot") || "");
    const back = `/book/${token}`;
    if (!picked) redirect(back);

    // Re-check everything from the token. Nothing is trusted from the form
    // except which slot was chosen.
    const fresh = await loadBooking(token);
    if (fresh.error) redirect(back);
    if (fresh.appt) redirect(back);

    const { error } = await fresh.db.from("appointments").insert({
      referral_id: fresh.ref.id,
      starts_at: picked,
      status: "booked",
    });

    if (error) {
      const clash = /duplicate key|unique constraint|one_booking_per_slot/i.test(
        error.message || ""
      );
      redirect(
        back +
          "?error=" +
          encodeURIComponent(
            clash
              ? "Sorry — somebody else took that time while you were choosing. Please pick another."
              : "Sorry, that didn't save. Please try again, or give us a ring."
          )
      );
    }

    await fresh.db
      .from("referrals")
      .update({ status: "booked" })
      .eq("id", fresh.ref.id);

    // Best-effort confirmation email. Never let mail trouble undo a booking.
    try {
      await sendAppointmentConfirmation({
        to: fresh.patient?.email || "",
        startsAtISO: picked,
        referralId: fresh.ref.id,
        patientFirstName: fresh.patient?.first_name,
        patientLastName: fresh.patient?.last_name,
      });
    } catch (e) {
      console.error("patient booking confirmation email failed:", e);
    }

    revalidatePath(back);
    redirect(back);
  }

  // ---------- Choose a time ----------
  const byDay = {};
  for (const s of slots) {
    if (!byDay[s.day]) byDay[s.day] = [];
    byDay[s.day].push(s);
  }

  return (
    <Shell>
      <p className="pb-eyebrow">Your dentist has referred you for a scan</p>
      <h1 className="pb-h1">Hello {firstName} — let&rsquo;s book you in.</h1>
      <p className="pb-lead">
        Your dentist has asked us to take a{" "}
        {scanType?.name ? scanType.name.toLowerCase() : "CBCT"} scan. Pick a time
        below that suits you. It takes one tap and there is nothing to sign up
        for.
      </p>

      {errorNote ? <div className="pb-alert">{errorNote}</div> : null}

      <QuickFacts />

      <h2 className="pb-h2">Choose a time</h2>

      {slots.length === 0 ? (
        <>
          <p className="pb-lead">
            We haven&rsquo;t any times online just at the moment. Please give us
            a ring and we&rsquo;ll find one that suits you.
          </p>
          <CallBox />
        </>
      ) : (
        <>
          {Object.keys(byDay).map((day) => (
            <div className="pb-day" key={day}>
              <h3 className="pb-day-name">{fmtDayFriendly(day)}</h3>
              <div className="pb-slots">
                {byDay[day].map((s) => (
                  <form action={takeSlot} key={s.iso}>
                    <input type="hidden" name="slot" value={s.iso} />
                    <button className="pb-slot" type="submit">
                      {fmtTimeFriendly(s.iso)}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
          <p className="pb-note">
            Another time would suit you better? Ring us on{" "}
            <a href={"tel:" + PHONE_TEL}>{PHONE}</a> and we&rsquo;ll sort it.
          </p>
        </>
      )}

      <WhereBox />
      <PrepBox />
      <FeeBox scanFee={scanFee} reportFee={reportFee} total={total} />
      <CallBox />
    </Shell>
  );
}

/* ---------------- pieces ---------------- */

function QuickFacts() {
  return (
    <div className="pb-facts">
      <div>
        <strong>15 minutes</strong>
        <span>Start to finish, most of it paperwork.</span>
      </div>
      <div>
        <strong>10 seconds</strong>
        <span>The scan itself, while you stand still.</span>
      </div>
      <div>
        <strong>No needles</strong>
        <span>Nothing touches you. It doesn&rsquo;t hurt at all.</span>
      </div>
    </div>
  );
}

function WhereBox() {
  return (
    <div className="pb-box">
      <h2 className="pb-h2">Where to find us</h2>
      <p className="pb-address">
        {ADDRESS_LINES.map((l) => (
          <span key={l}>
            {l}
            <br />
          </span>
        ))}
      </p>
      <p className="pb-note">There is free parking on site.</p>
      <p>
        <a className="pb-link" href={DIRECTIONS_URL}>
          Open directions in Google Maps
        </a>
      </p>
      <p className="pb-note">what3words: {WHAT3WORDS}</p>
    </div>
  );
}

function PrepBox() {
  return (
    <div className="pb-box">
      <h2 className="pb-h2">Before you come</h2>
      <p className="pb-lead">
        Please take off <strong>earrings, glasses and hairpins</strong> before
        your scan — metal can show up on the picture.
      </p>
      <p className="pb-lead">
        That&rsquo;s all. No fasting, no change to your tablets, nothing to
        bring.
      </p>
    </div>
  );
}

function FeeBox({ scanFee, reportFee, total }) {
  if (total === null) return null;
  return (
    <div className="pb-box">
      <h2 className="pb-h2">What it costs</h2>
      <table className="pb-fees">
        <tbody>
          <tr>
            <td>Scan</td>
            <td>{money(scanFee) || "—"}</td>
          </tr>
          {reportFee !== null ? (
            <tr>
              <td>Specialist report</td>
              <td>{money(reportFee)}</td>
            </tr>
          ) : null}
          <tr className="pb-fees-total">
            <td>Total</td>
            <td>{money(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="pb-note">
        Payment is taken on the day, at reception. We take card or cash.
      </p>
    </div>
  );
}

function CallBox() {
  return (
    <div className="pb-call">
      <p className="pb-call-t">Would you rather talk to somebody?</p>
      <a className="pb-call-btn" href={"tel:" + PHONE_TEL}>
        Call us on {PHONE}
      </a>
      <p className="pb-note">Monday to Friday, 9am to 5pm.</p>
    </div>
  );
}

function Shell({ children }) {
  return (
    <main className="pb">
      <div className="pb-inner">
        <header className="pb-brand">
          <span className="pb-brand-name">MyCBCT</span>
          <span className="pb-brand-by">by 360 Visualise</span>
        </header>
        {children}
        <footer className="pb-foot">
          360 Visualise · Octagon House · {PHONE} · hello@mycbct.co.uk
        </footer>
      </div>

      <style>{`
        .pb{min-height:100vh;background:#F4F0E6;color:#12263C;
          font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          padding:28px 18px 64px;font-size:19px;line-height:1.6;}
        .pb-inner{max-width:640px;margin:0 auto;}
        .pb-brand{margin-bottom:28px;}
        .pb-brand-name{font-family:'Fraunces',Georgia,serif;font-size:26px;
          font-weight:700;color:#12263C;display:block;}
        .pb-brand-by{font-size:13px;letter-spacing:.14em;text-transform:uppercase;
          color:#8A7A52;}
        .pb-eyebrow{font-size:14px;letter-spacing:.1em;text-transform:uppercase;
          color:#A8791F;font-weight:700;margin:0 0 8px;}
        .pb-h1{font-family:'Fraunces',Georgia,serif;font-size:34px;line-height:1.2;
          font-weight:600;margin:0 0 18px;}
        .pb-h2{font-family:'Fraunces',Georgia,serif;font-size:24px;font-weight:600;
          margin:32px 0 12px;}
        .pb-h2:first-child{margin-top:0;}
        .pb-lead{margin:0 0 16px;}
        .pb-note{font-size:16px;color:#5A6B7C;margin:8px 0 0;}
        .pb-alert{background:#FBE9E7;border:2px solid #D9705F;border-radius:12px;
          padding:16px 18px;margin:0 0 20px;font-weight:600;color:#8C2F1D;}
        .pb-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;
          margin:24px 0 8px;}
        .pb-facts div{background:#fff;border:1px solid #E4DCC8;border-radius:14px;
          padding:16px 14px;text-align:center;}
        .pb-facts strong{display:block;font-family:'Fraunces',Georgia,serif;
          font-size:21px;margin-bottom:6px;}
        .pb-facts span{font-size:15px;color:#5A6B7C;line-height:1.45;}
        .pb-day{margin:0 0 22px;}
        .pb-day-name{font-size:19px;font-weight:700;margin:0 0 10px;}
        .pb-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));
          gap:12px;}
        .pb-slot{width:100%;appearance:none;cursor:pointer;font:inherit;
          font-size:22px;font-weight:700;padding:20px 12px;border-radius:14px;
          background:#12263C;color:#fff;border:none;}
        .pb-slot:hover{background:#1d3a5c;}
        .pb-slot:focus-visible{outline:4px solid #E0A43B;outline-offset:3px;}
        .pb-box{background:#fff;border:1px solid #E4DCC8;border-radius:16px;
          padding:22px 24px;margin:28px 0 0;}
        .pb-address{margin:0 0 6px;font-size:19px;line-height:1.6;}
        .pb-link{color:#12263C;font-weight:700;}
        .pb-fees{width:100%;border-collapse:collapse;margin:4px 0 0;}
        .pb-fees td{padding:10px 0;border-bottom:1px solid #EFE8D8;}
        .pb-fees td:last-child{text-align:right;font-weight:700;white-space:nowrap;}
        .pb-fees-total td{border-bottom:none;font-size:22px;padding-top:14px;}
        .pb-call{background:#12263C;color:#F4F0E6;border-radius:16px;
          padding:24px;margin:28px 0 0;text-align:center;}
        .pb-call-t{margin:0 0 14px;font-size:20px;}
        .pb-call-btn{display:inline-block;background:#E0A43B;color:#12263C;
          font-weight:700;font-size:21px;text-decoration:none;padding:16px 26px;
          border-radius:999px;}
        .pb-call .pb-note{color:rgba(244,240,230,.7);}
        .pb-foot{margin:40px 0 0;font-size:15px;color:#7A8794;text-align:center;
          line-height:1.7;}
        @media(max-width:560px){
          .pb{font-size:18px;}
          .pb-h1{font-size:29px;}
          .pb-facts{grid-template-columns:1fr;}
          .pb-slots{grid-template-columns:1fr 1fr;}
        }
      `}</style>
    </main>
  );
}
