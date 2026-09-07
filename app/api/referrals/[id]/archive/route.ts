import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// v2 — this route now actually archives the referral.
//
// It used to contain a copy of the share-link code: every click of
// "Archive referral" minted a 14-day public share token for that patient and
// returned 200, so the button reported success and nothing was ever archived.
// Rachel found it on 4 Sept 2026. The correct logic already existed at
// app/referrals/[id]/archive/route.ts, which nothing called.
//
// components/ArchiveButton.tsx POSTs here, so the working code belongs here.

export async function POST(
  req: Request,
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

  let reason = "";
  try {
    const body = await req.json();
    reason = String(body?.reason || "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Reason required" }, { status: 400 });
  }

  // .select() so a row that RLS silently filters out comes back as a real
  // error rather than a cheerful 200 that changed nothing.
  const { data: updated, error } = await supabase
    .from("referrals")
    .update({
      archived: true,
      archive_reason: reason,
      archived_at: new Date().toISOString(),
      archived_by: auth.claims.sub,
    })
    .eq("id", id)
    .select("id, archived")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated?.archived) {
    return NextResponse.json(
      { error: "That referral wasn't archived — you may not have access to it." },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
