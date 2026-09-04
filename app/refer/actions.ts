"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { renderEmail } from "@/lib/emails/layout";

// v6 — stamps the price onto the referral when it is created.
// Until now scan_fee_pence and report_fee_pence were never written, so the
// patient confirmation email quoted "Scan fee £0.00, Total £0.00" on every
// booking. The scan type row is now read BEFORE the insert and its prices are
// copied onto the referral, which fixes the email and gives us a record of
// what was quoted on the day — later price changes don't rewrite history.
// Also replaces the hardcoded mycbct-portal.vercel.app links with SITE_URL.
//
// v5 — staff can submit referrals for a chosen practice.
// A practiceId in the input is honoured ONLY when the signed-in user's
// profile role is staff or admin; dentists always use their own practice.

// Who gets the "new referral received" email.
const NOTIFY = ["pete@360v.co.uk", "rachelh@360v.co.uk"];

// The live site. Set NEXT_PUBLIC_SITE_URL in Vercel; the fallback is the
// apex domain, never the staging vercel.app host.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://mycbct.co.uk"
).replace(/\/$/, "");

export type ReferralInput = {
  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD or ""
  sex: string; // "male" | "female" | "other" | ""
  pregnancy: string; // "no" | "yes" | "unsure" | "not_applicable"
  scanTypeId: string;
  regionOfInterest: string;
  clinicalNotes: string;
  reportRequested: boolean;
  signatureName: string;
  patientPhone: string;
  patientEmail: string;
  bookingMethod: string; // "book-now" | "contact-patient"
  practiceId?: string; // staff/admin only — ignored for dentists
};

export type ReferralResult =
  | { ok: true; referralId: string }
  | { ok: false; error: string };

// Best-effort email sender. Never throws into the caller's path —
// a mail hiccup must never stop a referral being filed.
async function sendEmail(to: string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MyCBCT <scans@mycbct.co.uk>",
        to,
        subject,
        html,
      }),
    });
  } catch {
    // Swallow — notifications are best-effort by design.
  }
}

function money(pence: number | null | undefined) {
  const amount = Number(pence) || 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function detailsTable(opts: {
  ref: string;
  patientName: string;
  practiceName: string;
  scanTypeName: string;
  signatureName: string;
  reportRequested: boolean;
  scanFeePence: number | null;
  reportFeePence: number | null;
}) {
  const feeRows = `
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Scan fee</td><td style="padding:6px 0;color:#12263C;">${money(opts.scanFeePence)}</td></tr>
      ${
        opts.reportRequested
          ? `<tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Report fee</td><td style="padding:6px 0;color:#12263C;">${money(opts.reportFeePence)}</td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Total</td><td style="padding:6px 0;color:#12263C;"><strong>${money((opts.scanFeePence || 0) + (opts.reportFeePence || 0))}</strong></td></tr>`
          : ""
      }`;

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;margin:0 0 8px 0;">
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Reference</td><td style="padding:6px 0;color:#12263C;"><strong>${opts.ref}</strong></td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Patient</td><td style="padding:6px 0;color:#12263C;"><strong>${opts.patientName}</strong></td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Practice</td><td style="padding:6px 0;color:#12263C;">${opts.practiceName}</td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Scan type</td><td style="padding:6px 0;color:#12263C;">${opts.scanTypeName}</td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Referred by</td><td style="padding:6px 0;color:#12263C;">${opts.signatureName}</td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Consultant report</td><td style="padding:6px 0;color:#12263C;">${opts.reportRequested ? "Requested" : "Not requested"}</td></tr>
      ${feeRows}
    </table>
  `;
}

export async function createReferral(
  input: ReferralInput
): Promise<ReferralResult> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) return { ok: false, error: "You're not signed in." };
  const userId = claims.sub as string;

  // Who is submitting, and which practice does this referral belong to?
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("practice_id, full_name, email, role")
    .eq("id", userId)
    .single();
  if (pErr || !profile) {
    return { ok: false, error: "Could not load your profile." };
  }

  const isStaff = profile.role === "staff" || profile.role === "admin";

  // Staff may pick any practice; dentists always use their own.
  const practiceId =
    isStaff && input.practiceId ? input.practiceId : profile.practice_id;
  if (!practiceId) {
    return {
      ok: false,
      error: isStaff ? "Please choose a practice." : "NO_PRACTICE",
    };
  }

  // Basic server-side validation (never trust the client alone).
  if (!input.firstName?.trim() || !input.lastName?.trim()) {
    return { ok: false, error: "Patient name is required." };
  }
  if (!input.scanTypeId) {
    return { ok: false, error: "Please choose a scan type." };
  }
  if (!input.pregnancy) {
    return { ok: false, error: "Please answer the pregnancy question." };
  }
  // The patient's own contact details are how we book them in, so both are required.
  if (!input.patientPhone?.trim()) {
    return { ok: false, error: "The patient's phone number is required." };
  }
  if (!input.patientEmail?.trim()) {
    return { ok: false, error: "The patient's email address is required." };
  }
  if (input.bookingMethod !== "book-now" && input.bookingMethod !== "contact-patient") {
    return { ok: false, error: "Please choose how the appointment should be arranged." };
  }

  // 0) Price the referral BEFORE saving it. The prices are copied onto the
  // referral row so the confirmation email, the referral view and any later
  // invoice all agree — and a future price change doesn't rewrite the past.
  const { data: scanType } = await supabase
    .from("scan_types")
    .select("name, base_price, report_cost_pence, report_price_pence")
    .eq("id", input.scanTypeId)
    .single();

  const reportRequested = !!input.reportRequested;
  const scanFeePence = scanType?.base_price ?? null;
  const reportFeePence = reportRequested
    ? (scanType?.report_price_pence ?? null)
    : null;
  const reportCostPence = reportRequested
    ? (scanType?.report_cost_pence ?? null)
    : null;

  // 1) Create the patient (scoped to the referral's practice).
  const { data: patient, error: patErr } = await supabase
    .from("patients")
    .insert({
      practice_id: practiceId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      date_of_birth: input.dob || null,
      sex: input.sex || null,
      phone: input.patientPhone.trim(),
      email: input.patientEmail.trim(),
    })
    .select("id")
    .single();
  if (patErr || !patient) {
    return { ok: false, error: patErr?.message || "Could not save the patient." };
  }

  // 2) Create the referral, stamped with the signed-in user and the price.
  // total_fee_pence and report_margin_pence are generated columns — the
  // database works those out, so never write to them here.
  const { data: referral, error: refErr } = await supabase
    .from("referrals")
    .insert({
      practice_id: practiceId,
      referring_dentist_id: userId,
      patient_id: patient.id,
      scan_type_id: input.scanTypeId,
      pregnancy: input.pregnancy,
      clinical_notes: input.clinicalNotes?.trim() || null,
      region_of_interest: input.regionOfInterest?.trim() || null,
      report_requested: reportRequested,
      booking_method: input.bookingMethod,
      scan_fee_pence: scanFeePence,
      report_fee_pence: reportFeePence,
      report_cost_pence: reportCostPence,
      signature_name:
        input.signatureName?.trim() || profile.full_name || null,
      status: "submitted",
    })
    .select("id")
    .single();
  if (refErr || !referral) {
    return { ok: false, error: refErr?.message || "Could not save the referral." };
  }

  // 3) Emails. Best-effort — sent after the referral is safely saved.
  const signature =
    input.signatureName?.trim() || profile.full_name || "Unknown";
  const patientName = `${input.firstName.trim()} ${input.lastName.trim()}`;
  const ref = referral.id.slice(0, 8).toUpperCase();

  const { data: practice } = await supabase
    .from("practices")
    .select("name")
    .eq("id", practiceId)
    .single();

  const details = detailsTable({
    ref,
    patientName,
    practiceName: practice?.name || "Unknown practice",
    scanTypeName: scanType?.name || "Unknown scan type",
    signatureName: signature,
    reportRequested,
    scanFeePence,
    reportFeePence,
  });

  const referralUrl = `${SITE_URL}/referrals/${referral.id}`;
  const dashboardUrl = `${SITE_URL}/dashboard`;

  // 3a) Team notification.
  await sendEmail(
    NOTIFY,
    `New referral: ${patientName} — ${scanType?.name || "Scan"} (${practice?.name || "Unknown practice"})`,
    renderEmail({
      preheader: `New referral for ${patientName} — ${scanType?.name || "Scan"}.`,
      heading: "New referral received",
      bodyHtml: details,
      button: { label: "Open this referral in MyCBCT", url: referralUrl },
    })
  );

  // 3b) Confirmation to the submitter (dentists get their copy here;
  // for staff this is just a receipt to their own inbox).
  if (profile.email) {
    await sendEmail(
      [profile.email],
      `Referral received: ${patientName} (ref ${ref})`,
      renderEmail({
        preheader: `We've received your referral for ${patientName}.`,
        heading: "Thank you — your referral is in",
        bodyHtml: `
          <p style="margin:0 0 20px 0;">
            We've received your referral for <strong style="color:#12263C;">${patientName}</strong>.
            We'll take it from here &mdash; you'll get another email when the scan
            is ready to view.
          </p>
          ${details}`,
        button: { label: "View your referrals in MyCBCT", url: dashboardUrl },
        footnote: "Questions? Reply to this email or call 360 Visualise.",
      })
    );
  }

  revalidatePath("/dashboard");
  return { ok: true, referralId: referral.id };
}
