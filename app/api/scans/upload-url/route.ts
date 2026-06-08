import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { presignUpload } from "@/lib/backblaze";

export const runtime = "nodejs";

function safeName(name: string) {
  const cleaned = (name || "file").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return cleaned.slice(-120) || "file";
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
  const referralId = body?.referralId;
  const filename = body?.filename;
  if (!referralId || !filename) {
    return NextResponse.json({ error: "Missing referralId or filename" }, { status: 400 });
  }

  const key = `scans/${referralId}/${crypto.randomUUID()}-${safeName(filename)}`;
  const uploadUrl = await presignUpload(key);
  return NextResponse.json({ uploadUrl, key });
}
