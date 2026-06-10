"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

// Best-effort email to the team. Never throws into the caller's path —
// a mail hiccup must never stop a referral being filed.
async function notifyTeam(opts: {
  referralId: string;
  patientName: string;
  practiceName: string;
  scanTypeName: string;
  signatureName: string;
  reportRequested: boolean;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const ref = opts.referralId.slice(0, 8).toUpperCase();
  const subject = `New referral: ${opts.patientName} — ${opts.scanTypeName} (${opts.practiceName})`;

  const html = `
    <h2 style="margin:0 0 12px;">New referral received</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Reference</td><td style="padding:4px 0;"><strong>${ref}</strong></td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Patient</td><td style="padding:4px 0;"><strong>${opts.patientName}</strong></td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Practice</td><td style="padding:4px 0;">${opts.practiceName}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Scan type</td><td style="padding:4px 0;">${opts.scanTypeName}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Referred by</td><td style="padding:4px 0;">${opts.signatureName}</td></tr>
      <tr><td style="padding:4px 14px 4px 0;color:#666;">Consultant report</td><td style="padding:4px 0;">${opts.reportRequested ? "Requested" : "Not requested"}</td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;font-size:14px;">
      <a href="https://mycbct-portal.vercel.app/referrals/${opts.referralId}">Open this referral in MyCBCT</a>
    </p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MyCBCT <scans@mycbct.co.uk>",
        to: NOTIFY,
        subject,
        html,
      }),
    });
  } catch {
    // Swallow — notification is best-effort by design.
  }
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
    .select("practice_id, full_name")
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

  // 3) Tell the team. Best-effort — happens after the referral is safely
  // saved, and any failure is swallowed inside notifyTeam.
  const signature =
    input.signatureName?.trim() || profile.full_name || "Unknown";
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
  await notifyTeam({
    referralId: referral.id,
    patientName: `${input.firstName.trim()} ${input.lastName.trim()}`,
    practiceName: practice?.name || "Unknown practice",
    scanTypeName: scanType?.name || "Unknown scan type",
    signatureName: signature,
    reportRequested: !!input.reportRequested,
  });

  revalidatePath("/dashboard");
  return { ok: true, referralId: referral.id };
}
