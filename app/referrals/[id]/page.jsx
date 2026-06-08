import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getObjectText, presignView } from "@/lib/backblaze";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // RLS ensures the user can only read scans for their own practice (or staff/all).
  const { data: scan } = await supabase
    .from("scans")
    .select("preview_status")
    .eq("id", id)
    .single();

  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only ready scans have frames to show. Anything else: tell the client the
  // status so it can show "preparing" rather than a broken viewer.
  if ((scan as any).preview_status !== "ready") {
    return NextResponse.json(
      { status: (scan as any).preview_status || "none" },
      { status: 409 }
    );
  }

  // The worker wrote previews/<scan_id>/manifest.json beside the original.
  const prefix = `previews/${id}/`;

  let manifest: any;
  try {
    manifest = JSON.parse(await getObjectText(prefix + "manifest.json"));
  } catch {
    return NextResponse.json({ error: "Preview unavailable" }, { status: 404 });
  }

  // Turn every frame path into a short-lived inline URL the browser can show.
  const planes: Record<string, any> = {};
  for (const name of ["axial", "coronal", "sagittal"]) {
    const plane = manifest.planes?.[name];
    if (!plane || !Array.isArray(plane.frames) || plane.frames.length === 0) {
      continue;
    }
    const frames = await Promise.all(
      plane.frames.map((f: string) => presignView(prefix + f))
    );
    planes[name] = { width: plane.width, height: plane.height, frames };
  }

  return NextResponse.json({ planes });
}
