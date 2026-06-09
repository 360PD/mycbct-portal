import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Privileged client, used only to look up the referring dentist's email so we
// can notify them. Reading another user's profile may be blocked by row-level
// security for a staff session, so the service role makes the lookup reliable.
// Server-only; the key is never sent to the browser. Falls back to the caller's
// client if the key isn't set (the email is best-effort either way).
function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// Email the referring dentist that their scan is ready. Best-effort: any
// failure is swallowed so it can never break the upload. Only fires for the
// FIRST scan on a referral, and only if the dentist has an email on file.
async function notifyDentist(db: any, referralId: string) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return; // email not configured yet

    // First scan only. After the insert above, a count of 1 means this is it.
    const { count } = await db
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("referral_id", referralId);
    if ((count || 0) > 1) return;

    // Who referred it, and for which patient.
    const { data: ref } = await db
      .from("referrals")
      .select("referring_dentist_id, patients(first_name,last_name)")
      .eq("id", referralId)
      .single();
    if (!ref?.referring_dentist_id) return;

    const { data: dentist } = await db
      .from("profiles")
      .select("email, full_name")
      .eq("id", ref.referring_dentist_id)
      .single();

    const to = dentist?.email;
    if (!to) return; // no email (e.g. historical stand-in) — skip silently

    const patient = Array.isArray(ref.patients) ? ref.patients[0] : ref.patients;
    const patientName = patient
      ? [patient.first_name, patient.last_name].filter(Boolean).join(" ")
      : "your patient";

    const signin = "https://mycbct-portal.vercel.app/sign-in";
    const subject = `Scan ready: ${patientName}`;

    const text =
      `The scan you referred for ${patientName} has been completed and is ready to view.\n\n` +
      `Log in to MyCBCT to view and download it:\n${signin}\n`;

    const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#0e1b2e;padding:32px;">
    <div style="max-width:520px;margin:0 auto;background:#13243b;border-radius:12px;padding:28px 30px;color:#f7f4ec;">
      <h1 style="font-size:20px;margin:0 0 16px;color:#e7ae3b;">Scan ready</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px;">
        The scan you referred for <strong>${patientName}</strong> has been completed and is ready to view.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 22px;">
        Log in to MyCBCT to view and download it.
      </p>
      <a href="${signin}" style="display:inline-block;background:#e7ae3b;color:#0e1b2e;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:8px;">View the scan</a>
      <p style="font-size:12px;line-height:1.5;margin:24px 0 0;color:rgba(247,244,236,0.5);">
        If the button doesn't work, paste this link into your browser:<br>${signin}
      </p>
    </div>
  </div>`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MyCBCT <scans@mycbct.co.uk>",
        to: [to],
        subject,
        text,
        html,
      }),
    });
  } catch (e) {
    // Email must never break the upload — log and move on.
    console.error("scan-ready email failed:", e);
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();

  const role = (profile as any)?.role;
  if (role !== "staff" && role !== "admin") {
    return NextResponse.json({ error: "Only staff can upload scans" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const { referralId, key, filename, contentType, sizeBytes } = body || {};
  if (!referralId || !key) {
    return NextResponse.json({ error: "Missing referralId or key" }, { status: 400 });
  }

  const isZip =
    (filename || "").toLowerCase().endsWith(".zip") ||
    contentType === "application/zip" ||
    contentType === "application/x-zip-compressed";

  const { data: scan, error } = await supabase
    .from("scans")
    .insert({
      referral_id: referralId,
      storage_key: key,
      original_filename: filename || null,
      file_size_bytes: sizeBytes || null,
      uploaded_by: claims.sub,
      preview_status: isZip ? "pending" : "none",
    })
    .select("id")
    .single();

  if (error || !scan) {
    return NextResponse.json(
      { error: error?.message || "Could not save the scan" },
      { status: 400 }
    );
  }

  // Move the referral forward so the dashboard reflects reality.
  await supabase.from("referrals").update({ status: "scanned" }).eq("id", referralId);

  // Tell the referring dentist their scan is ready (first scan only, best-effort).
  const notifyDb = adminClient() || supabase;
  await notifyDentist(notifyDb, referralId);

  return NextResponse.json({ ok: true, scanId: (scan as any).id });
}
