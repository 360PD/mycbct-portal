"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// v4 — team notification + dentist confirmation, neutral wording.

// Who gets the "new referral received" email.
const NOTIFY = ["pete@360v.co.uk", "rachelh@360v.co.uk"];

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

function detailsTable(opts: {
  ref: string;
  patientName: string;
  practiceName: string;
  scanTypeName: string;
  signatureName: string;
  reportRequested: boolean;
}) {
  return `
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Reference</td><td style="padding:4px 0;"><strong>${opts.ref}</strong></td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Patient</td><td style="padding:4px 0;"><strong>${opts.patientName}</strong></td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Practice</td><td style="padding:4px 0;">${opts.practiceName}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Scan type</td><td style="padding:4px 0;">${opts.scanTypeName}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Referred by</td><td style="padding:4px 0;">${opts.signatureName}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Consultant report</td><td style="padding:4px 0;">${opts.reportRequested ? "Requested" : "Not requested"}</td></tr>
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

  // Who is the dentist, and which practice are they in?
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("practice_id, full_name, email")
    .eq("id", userId)
    .single();
  if (pErr || !profile) {
    return { ok: false, error: "Could not load your profile." };
  }
  if (!profile.practice_id) {
    return { ok: false, error: "NO_PRACTICE" };
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

  // 1) Create the patient (scoped to the dentist's practice).
  const { data: patient, error: patErr } = await supabase
    .from("patients")
    .insert({
      practice_id: profile.practice_id,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      date_of_birth: input.dob || null,
      sex: input.sex || null,
    })
    .select("id")
    .single();
  if (patErr || !patient) {
    return { ok: false, error: patErr?.message || "Could not save the patient." };
  }

  // 2) Create the referral, stamped with the signed-in dentist.
  const { data: referral, error: refErr } = await supabase
    .from("referrals")
    .insert({
      practice_id: profile.practice_id,
      referring_dentist_id: userId,
      patient_id: patient.id,
      scan_type_id: input.scanTypeId,
      pregnancy: input.pregnancy,
      clinical_notes: input.clinicalNotes?.trim() || null,
      region_of_interest: input.regionOfInterest?.trim() || null,
      report_requested: !!input.reportRequested,
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

  const [{ data: practice }, { data: scanType }] = await Promise.all([
    supabase
      .from("practices")
      .select("name")
      .eq("id", profile.practice_id)
      .single(),
    supabase
      .from("scan_types")
      .select("name")
      .eq("id", input.scanTypeId)
      .single(),
  ]);

  const details = detailsTable({
    ref,
    patientName,
    practiceName: practice?.name || "Unknown practice",
    scanTypeName: scanType?.name || "Unknown scan type",
    signatureName: signature,
    reportRequested: !!input.reportRequested,
  });

  // 3a) Team notification.
  await sendEmail(
    NOTIFY,
    `New referral: ${patientName} — ${scanType?.name || "Scan"} (${practice?.name || "Unknown practice"})`,
    `
      <h2 style="margin:0 0 12px;">New referral received</h2>
      ${details}
      <p style="font-family:Arial,sans-serif;font-size:14px;">
        <a href="https://mycbct-portal.vercel.app/referrals/${referral.id}">Open this referral in MyCBCT</a>
      </p>
    `
  );

  // 3b) Confirmation to the referring dentist.
  if (profile.email) {
    await sendEmail(
      [profile.email],
      `Referral received: ${patientName} (ref ${ref})`,
      `
        <h2 style="margin:0 0 12px;">Thank you — your referral is in</h2>
        <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">
          We've received your referral for <strong>${patientName}</strong>.
          We'll take it from here &mdash; you'll get another email when the scan
          is ready to view.
        </p>
        ${details}
        <p style="font-family:Arial,sans-serif;font-size:14px;">
          <a href="https://mycbct-portal.vercel.app/dashboard">View your referrals in MyCBCT</a>
        </p>
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#888;">
          Questions? Reply to this email or call 360 Visualise.
        </p>
      `
    );
  }

  revalidatePath("/dashboard");
  return { ok: true, referralId: referral.id };
}
