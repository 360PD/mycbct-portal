import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.claims.sub)
    .maybeSingle();

  if (!profile || (profile.role !== "staff" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reason } = await req.json();
  if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  const { error } = await supabase
    .from("referrals")
    .update({
      archived: true,
      archive_reason: reason,
      archived_at: new Date().toISOString(),
      archived_by: auth.claims.sub,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
