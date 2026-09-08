// v4 — every day with a free slot is now listed, closed until tapped, rather
// than only the next fifteen times. And the three "what to expect" facts are
// one plain bulleted panel: as separate white cards they looked like something
// you were meant to choose between.
//
// v3 — the time buttons and the pay button now react the instant they're
// pressed: the one you pressed says "Booking…", the rest go flat, and none of
// them can be pressed twice. They also darken on hover and press in slightly.
// Also adds two hours' notice on the last bookable slot, so nobody can book a
// time nobody at this end knows about yet.
//
// v2 — the patient can pay online after booking, or still pay on the day.
// Stripe Checkout: they leave for Stripe's hosted page and come back. Card
// details never touch this site. Paying is optional by design — an older or
// wary patient who won't put a card in online can still just turn up and pay
// at reception, and we'd rather have the booking than the card.
//
// v1.1 — fixes "a small scan scan", and refuses to offer a booking for a
// referral that has already been scanned, delivered, invoiced or cancelled.
//
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
import {
  createCheckoutSession,
  getCheckoutSession,
  stripeConfigured,
} from "@/lib/stripe";
import { PatientSlots, PayButton } from "@/components/PatientBookingButtons";

export const dynamic = "force-dynamic";

const WEEKS_AHEAD = 8;

// A ceiling, not a target. Every free slot in the diary is offered; this only
// stops the page growing without limit if somebody opens up months at once.
const MAX_SLOTS_SHOWN = 400;

// How much warning we insist on. A patient booking 4:25pm for 4:30pm is a
// patient nobody is expecting. Two hours still allows same-day booking.
const MIN_NOTICE_MINUTES = 120;

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

// "Small scan" -> "a small scan"; "OPG" -> "an OPG". Avoids "a small scan scan".
function scanPhrase(name) {
  const n = String(name || "").trim();
  if (!n) return "a CBCT scan";
  const isAcronym = n === n.toUpperCase();
  const shown = isAcronym ? n : n.charAt(0).toLowerCase() + n.slice(1);
  return (/^[aeiou]/i.test(shown) ? "an " : "a ") + shown;
}

// Statuses where the scan has already happened or been called off. Offering a
// booking for one of these would be wrong and confusing.
const CLOSED_STATUSES = ["scanned", "delivered", "invoiced", "cancelled"];

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
  if (CLOSED_STATUSES.includes(String(ref.status))) return { error: "done" };

  const patient = one(ref.patients);
  const scanType = one(ref.scan_types);

  const { data: appt } = await db
    .from("appointments")
    .select("id, starts_at, status")
    .eq("referral_id", ref.id)
    .eq("status", "booked")
    .maybeSingle();

  const { data: paid } = await db
    .from("payments")
    .select("id, status, amount_pence, paid_at")
    .eq("referral_id", ref.id)
    .eq("status", "paid")
    .maybeSingle();

  return { db, token: row.token, ref, patient, scanType, appt, paid };
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

  const earliestMs = Date.now() + MIN_NOTICE_MINUTES * 60 * 1000;
  const out = [];
  for (const day of Object.keys(byDay).sort()) {
    for (const time of buildSlotTimes(byDay[day])) {
      const iso = londonSlotISO(day, time);
      if (takenSet.has(iso)) continue;
      // Gone, or too soon for us to have got ready for them.
      if (new Date(iso).getTime() < earliestMs) continue;
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
  const returningSession = sp.session_id ? String(sp.session_id) : "";

  // Coming back from Stripe. The webhook is the authority, but it can be a
  // moment behind, so check the session here too and record it if it's paid.
  if (returningSession) {
    try {
      const db0 = admin();
      const session = await getCheckoutSession(returningSession);
      if (db0 && session?.payment_status === "paid") {
        await db0
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
          })
          .eq("stripe_session_id", session.id)
          .neq("status", "paid");
      }
    } catch (e) {
      console.error("could not confirm the returning payment:", e);
    }
  }

  const loaded = await loadBooking(token);

  if (loaded.error) {
    const title =
      loaded.error === "expired"
        ? "This booking link has expired"
        : loaded.error === "done"
          ? "This scan is already sorted"
          : loaded.error === "unavailable"
            ? "Booking is temporarily unavailable"
            : "We couldn't find that booking link";
    const body =
      loaded.error === "done"
        ? "Our records show this scan has already been done or is no longer needed. If that doesn't sound right, please give us a ring and we'll check for you."
        : "Please give us a ring and we'll book your scan over the phone. It only takes a minute.";
    return (
      <Shell>
        <h1 className="pb-h1">{title}</h1>
        <p className="pb-lead">{body}</p>
        <CallBox />
      </Shell>
    );
  }

  const { db, ref, patient, scanType, appt, paid } = loaded;

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

  // ---------- Server action: start a payment ----------
  async function startPayment() {
    "use server";

    const back = `/book/${token}`;
    const fresh = await loadBooking(token);
    if (fresh.error || !fresh.appt || fresh.paid) redirect(back);

    // Work the amount out again here. Never trust a number from the browser.
    const sFee = fresh.ref.scan_fee_pence ?? fresh.scanType?.base_price ?? 0;
    const rFee = fresh.ref.report_requested
      ? (fresh.ref.report_fee_pence ?? fresh.scanType?.report_price_pence ?? 0)
      : 0;
    const amount = Number(sFee) + Number(rFee);

    if (!amount || amount < 100) {
      redirect(
        back + "?error=" + encodeURIComponent(
          "We couldn't work out the fee. Please give us a ring and we'll take payment over the phone."
        )
      );
    }

    let url = "";
    try {
      const site = (
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.mycbct.co.uk"
      ).replace(/\/$/, "");

      const session = await createCheckoutSession({
        amountPence: amount,
        description: `CBCT scan — ${fresh.scanType?.name || "scan"}`,
        referralId: fresh.ref.id,
        patientEmail: fresh.patient?.email,
        successUrl: `${site}${back}?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${site}${back}?error=${encodeURIComponent(
          "Payment cancelled — your appointment is still booked. You can pay on the day."
        )}`,
      });

      await fresh.db.from("payments").insert({
        referral_id: fresh.ref.id,
        stripe_session_id: session.id,
        amount_pence: amount,
        status: "pending",
      });

      url = session.url;
    } catch (e) {
      console.error("could not start a payment:", e);
      redirect(
        back + "?error=" + encodeURIComponent(
          "We couldn't start the payment just now. Your appointment is still booked — you can pay on the day, or ring us."
        )
      );
    }

    redirect(url);
  }

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
        {errorNote ? <div className="pb-alert">{errorNote}</div> : null}
        <WhereBox />
        <PrepBox />
        <FeeBox
          scanFee={scanFee}
          reportFee={reportFee}
          total={total}
          paid={!!paid}
          canPay={stripeConfigured() && !paid && !!total}
          onPay={startPayment}
        />
        <p className="pb-lead">
          Need to change or cancel? Please ring us as early as you can so we can
          offer the time to somebody else. If you have paid, we&rsquo;ll refund
          you in full whenever you cancel.
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

    // And check the notice period again — the buttons were drawn a while ago.
    if (
      new Date(picked).getTime() <
      Date.now() + MIN_NOTICE_MINUTES * 60 * 1000
    ) {
      redirect(
        back +
          "?error=" +
          encodeURIComponent(
            "That time is a little too soon for us to get ready. Please pick a later one, or ring us and we'll squeeze you in."
          )
      );
    }

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
  // Formatted here, on the server, so the buttons don't depend on whatever
  // date support the patient's phone happens to have.
  const grouped = {};
  for (const s of slots) {
    if (!grouped[s.day]) grouped[s.day] = [];
    grouped[s.day].push({ iso: s.iso, label: fmtTimeFriendly(s.iso) });
  }
  const days = Object.keys(grouped)
    .sort()
    .map((day) => ({
      day,
      label: fmtDayFriendly(day),
      slots: grouped[day],
    }));

  return (
    <Shell>
      <p className="pb-eyebrow">Your dentist has referred you for a scan</p>
      <h1 className="pb-h1">Hello {firstName} — let&rsquo;s book you in.</h1>
      <p className="pb-lead">
        Your dentist has asked us to take {scanPhrase(scanType?.name)}. Pick a
        time below that suits you. It takes one tap and there is nothing to sign
        up for.
      </p>

      {errorNote ? <div className="pb-alert">{errorNote}</div> : null}

      <QuickFacts />

      <h2 className="pb-h2">Choose a time</h2>

      {days.length === 0 ? (
        <>
          <p className="pb-lead">
            We haven&rsquo;t any times online just at the moment. Please give us
            a ring and we&rsquo;ll find one that suits you.
          </p>
          <CallBox />
        </>
      ) : (
        <>
          <p className="pb-lead">
            Tap a day to see the times we have free, then tap a time to book it.
          </p>
          <PatientSlots action={takeSlot} days={days} />
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

// One panel, plainly something to read. As three separate white cards these
// looked like three things to choose between, and patients tried to tap them.
function QuickFacts() {
  return (
    <div className="pb-facts">
      <p className="pb-facts-t">What to expect</p>
      <ul className="pb-facts-list">
        <li>
          <strong>About 15 minutes</strong> from arriving to leaving, and most
          of that is paperwork.
        </li>
        <li>
          <strong>The scan itself takes 10 seconds.</strong> You stand still
          while the scanner moves around your head.
        </li>
        <li>
          <strong>Nothing touches you and it doesn&rsquo;t hurt.</strong> No
          needles, and you can go straight back to your day afterwards.
        </li>
      </ul>
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

function FeeBox({ scanFee, reportFee, total, paid, canPay, onPay }) {
  if (total === null) return null;
  return (
    <div className="pb-box">
      <h2 className="pb-h2">
        What it costs
        {paid ? <span className="pb-paid">Paid</span> : null}
      </h2>
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
      {paid ? (
        <p className="pb-note">
          Thank you — that&rsquo;s paid in full. Nothing to bring on the day.
        </p>
      ) : canPay ? (
        <>
          <PayButton action={onPay} />
          <p className="pb-note">
            Or pay at reception on the day — card or cash, whichever you prefer.
            Paying now just saves you a minute when you arrive.
          </p>
          <p className="pb-note">
            If you cancel, we refund you in full, however much notice you give.
          </p>
        </>
      ) : (
        <p className="pb-note">
          Payment is taken on the day, at reception. We take card or cash.
        </p>
      )}
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
        /* Plainly a thing to read, not a thing to choose. Flat panel, gold
           rule down the side, ordinary bullets. */
        .pb-facts{background:#FBF8F1;border:1px solid #E8E0D0;
          border-left:6px solid #E0A43B;border-radius:12px;
          padding:20px 24px;margin:24px 0 8px;}
        .pb-facts-t{margin:0 0 12px;font-size:13px;letter-spacing:.12em;
          text-transform:uppercase;font-weight:700;color:#A8791F;}
        .pb-facts-list{margin:0;padding:0 0 0 22px;}
        .pb-facts-list li{margin:0 0 10px;line-height:1.55;}
        .pb-facts-list li:last-child{margin-bottom:0;}
        .pb-facts-list strong{color:#12263C;}

        /* One row per day, closed until tapped. Deliberately a pale row with
           a chevron, so it can't be mistaken for a time button. */
        .pb-days{margin:0 0 4px;}
        .pb-daybox{background:#fff;border:1px solid #E4DCC8;border-radius:14px;
          margin:0 0 12px;overflow:hidden;}
        .pb-daysum{display:flex;align-items:center;gap:12px;padding:18px 20px;
          cursor:pointer;list-style:none;font-size:20px;font-weight:700;
          -webkit-tap-highlight-color:transparent;}
        .pb-daysum::-webkit-details-marker{display:none;}
        .pb-daysum:hover{background:#FBF8F1;}
        .pb-daysum:focus-visible{outline:4px solid #E0A43B;outline-offset:-4px;}
        .pb-dayname{flex:1;}
        .pb-daycount{font-size:16px;font-weight:600;color:#5A6B7C;
          white-space:nowrap;}
        .pb-daysum::after{content:"";width:11px;height:11px;flex:none;
          border-right:3px solid #5A6B7C;border-bottom:3px solid #5A6B7C;
          transform:rotate(45deg) translate(-3px,-3px);
          transition:transform .15s ease;}
        .pb-daybox[open] .pb-daysum{border-bottom:1px solid #EFE8D8;}
        .pb-daybox[open] .pb-daysum::after{
          transform:rotate(-135deg) translate(-3px,-3px);}
        .pb-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));
          gap:12px;padding:18px 20px 20px;}

        /* Buttons that answer back. Colour on hover, a press-in on tap, and a
           clear "working on it" state while the server thinks. */
        .pb-slot{width:100%;appearance:none;cursor:pointer;font:inherit;
          font-size:22px;font-weight:700;padding:20px 12px;border-radius:14px;
          background:#12263C;color:#fff;border:2px solid #12263C;
          -webkit-tap-highlight-color:transparent;
          transition:background .12s ease,transform .08s ease,box-shadow .12s ease;}
        .pb-slot:hover{background:#1D3A5C;border-color:#1D3A5C;
          box-shadow:0 4px 14px rgba(18,38,60,.22);}
        .pb-slot:active{transform:scale(.96);background:#0B1A2B;box-shadow:none;}
        .pb-slot:focus-visible{outline:4px solid #E0A43B;outline-offset:3px;}
        .pb-slot:disabled{cursor:default;box-shadow:none;transform:none;
          background:#C9D2DB;border-color:#C9D2DB;color:#6B7A88;}
        .pb-slot.is-busy,.pb-slot.is-busy:disabled{background:#E0A43B;
          border-color:#E0A43B;color:#12263C;font-size:19px;}

        .pb-box{background:#fff;border:1px solid #E4DCC8;border-radius:16px;
          padding:22px 24px;margin:28px 0 0;}
        .pb-address{margin:0 0 6px;font-size:19px;line-height:1.6;}
        .pb-link{color:#12263C;font-weight:700;}
        .pb-fees{width:100%;border-collapse:collapse;margin:4px 0 0;}
        .pb-fees td{padding:10px 0;border-bottom:1px solid #EFE8D8;}
        .pb-fees td:last-child{text-align:right;font-weight:700;white-space:nowrap;}
        .pb-fees-total td{border-bottom:none;font-size:22px;padding-top:14px;}
        .pb-pay{display:block;width:100%;margin-top:16px;appearance:none;
          border:2px solid #12263C;cursor:pointer;font:inherit;font-size:20px;
          font-weight:700;background:#12263C;color:#fff;border-radius:14px;
          padding:18px 20px;-webkit-tap-highlight-color:transparent;
          transition:background .12s ease,transform .08s ease,box-shadow .12s ease;}
        .pb-pay:hover{background:#1D3A5C;border-color:#1D3A5C;
          box-shadow:0 4px 14px rgba(18,38,60,.22);}
        .pb-pay:active{transform:scale(.98);background:#0B1A2B;box-shadow:none;}
        .pb-pay:focus-visible{outline:4px solid #E0A43B;outline-offset:3px;}
        .pb-pay:disabled{cursor:default;transform:none;box-shadow:none;}
        .pb-pay.is-busy,.pb-pay.is-busy:disabled{background:#E0A43B;
          border-color:#E0A43B;color:#12263C;}
        .pb-paid{margin-left:10px;font-family:'DM Sans',system-ui,sans-serif;
          font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
          color:#1d6b4f;background:#dcefe4;border-radius:999px;padding:4px 12px;
          vertical-align:middle;}
        .pb-call{background:#12263C;color:#F4F0E6;border-radius:16px;
          padding:24px;margin:28px 0 0;text-align:center;}
        .pb-call-t{margin:0 0 14px;font-size:20px;}
        .pb-call-btn{display:inline-block;background:#E0A43B;color:#12263C;
          font-weight:700;font-size:21px;text-decoration:none;padding:16px 26px;
          border-radius:999px;}
        .pb-call .pb-note{color:rgba(244,240,230,.7);}
        .pb-foot{margin:40px 0 0;font-size:15px;color:#7A8794;text-align:center;
          line-height:1.7;}
        @media(prefers-reduced-motion:reduce){
          .pb-slot,.pb-pay{transition:background .12s ease;}
          .pb-slot:active,.pb-pay:active{transform:none;}
        }
        @media(max-width:560px){
          .pb{font-size:18px;}
          .pb-h1{font-size:29px;}
          .pb-facts{padding:18px 20px;}
          .pb-daysum{font-size:18px;padding:16px 16px;}
          .pb-slots{grid-template-columns:1fr 1fr;padding:16px;}
        }
      `}</style>
    </main>
  );
}
