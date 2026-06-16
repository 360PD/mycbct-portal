import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendDnaNotice } from "@/lib/emails/send-dna-notice";

export const runtime = "nodejs";

function one(v: unknown) {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.claims.sub)
    .maybeSingle();

  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("id, starts_at, status, referral_id")
    .eq("id", id)
    .maybeSingle();

  if (apptErr || !appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (appt.status === "dna") {
    return NextResponse.json({ error: "Already marked as DNA" }, { status: 409 });
  }
  if (appt.status !== "booked") {
    return NextResponse.json(
      { error: "Only booked appointments can be marked as DNA" },
      { status: 400 }
    );
  }

  const db = adminClient() || supabase;
  const { error: updErr } = await db
    .from("appointments")
    .update({ status: "dna" })
    .eq("id", id)
    .eq("status", "booked");

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { data: ref } = await db
    .from("referrals")
    .select(
      "referring_dentist_id, patients(first_name, last_name, date_of_birth, email), scan_types(name)"
    )
    .eq("id", appt.referral_id)
    .maybeSingle();

  const patient = one(ref?.patients);
  const scanType = one(ref?.scan_types);
  const patientName = patient
    ? [patient.first_name, patient.last_name].filter(Boolean).join(" ")
    : "Patient";

  let dentistEmail: string | null = null;
  if (ref?.referring_dentist_id) {
    const { data: dentist } = await db
      .from("profiles")
      .select("email")
      .eq("id", ref.referring_dentist_id)
      .maybeSingle();
    dentistEmail = dentist?.email || null;
  }

  if (dentistEmail) {
    await sendDnaNotice({
      dentistEmail,
      patientEmail: patient?.email || null,
      patientName,
      patientDob: patient?.date_of_birth || null,
      scanTypeName: scanType?.name || "—",
      startsAtISO: appt.starts_at,
    });
  }

  revalidatePath("/diary-view");
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true });
}
