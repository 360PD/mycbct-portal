import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  return NextResponse.json({ ok: true, scanId: (scan as any).id });
}
