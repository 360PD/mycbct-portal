import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getObjectText, presignView } from "@/lib/backblaze";

export const runtime = "nodejs";

// Supabase returns a to-one embed as an object, but can hand back an array.
function one(v: any) {
  if (Array.isArray(v)) return v[0] || null;
  return v || null;
}

// A privileged client used ONLY to flip preview_status none -> pending when a
// scan is first opened. Row-level security stops a dentist updating a scan
// row, so the user's own client can't do this flip - the service role can.
// Server-only (this file runs on nodejs); the key is never sent to the browser.
function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

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
  // Pull the referral's scan type too, so we only ever build previews for CBCT.
  const { data: scan } = await supabase
    .from("scans")
    .select("preview_status, referrals(scan_types(code,name))")
    .eq("id", id)
    .single();

  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = (scan as any).preview_status || "none";

  // Is this a CBCT scan? Only CBCT gets a slice preview. OPG scans are JPEGs
  // and are their own image - never sent through the worker.
  const refRow = one((scan as any).referrals);
  const typeRow = refRow ? one(refRow.scan_types) : null;
  const typeStr = ((typeRow?.code || "") + " " + (typeRow?.name || "")).toLowerCase();
  const isCbct = typeStr.includes("cbct");

  // Ready: hand back the frames (the main path).
  if (status === "ready") {
    const prefix = `previews/${id}/`;
    let manifest: any;
    try {
      manifest = JSON.parse(await getObjectText(prefix + "manifest.json"));
    } catch {
      return NextResponse.json({ error: "Preview unavailable" }, { status: 404 });
    }
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

  // Not a CBCT scan: there's no slice preview to build. Tell the client so it
  // shows nothing rather than spinning forever.
  if (!isCbct) {
    return NextResponse.json({ status, previewable: false }, { status: 409 });
  }

  // CBCT, but never queued (historical import sets 'none'). Flip it to pending
  // on first view so the worker picks it up - the on-demand build.
  if (status === "none") {
    const flip = adminClient() || supabase; // service role preferred; user client as fallback
    await flip
      .from("scans")
      .update({ preview_status: "pending" })
      .eq("id", id)
      .eq("preview_status", "none"); // only flip if still none - never clobber a live build
    return NextResponse.json({ status: "pending", previewable: true }, { status: 409 });
  }

  // pending / processing / failed: report the status so the client can show
  // "preparing" (and keep polling) or a failed message.
  return NextResponse.json({ status, previewable: true }, { status: 409 });
}
