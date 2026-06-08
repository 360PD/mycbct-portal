import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { presignDownload } from "@/lib/backblaze";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // RLS ensures the user can only read scans for their own practice (or staff/all).
  const { data: scan } = await supabase
    .from("scans")
    .select("storage_key, original_filename")
    .eq("id", id)
    .single();

  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await presignDownload(
    (scan as any).storage_key,
    (scan as any).original_filename
  );
  return NextResponse.redirect(url);
}
