"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/dashboard");
  return { ok: true, referralId: referral.id };
}
