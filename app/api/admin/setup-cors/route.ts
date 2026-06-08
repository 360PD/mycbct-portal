import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setBucketCors } from "@/lib/backblaze";

export const runtime = "nodejs";

// Visit this once, signed in as an admin, to allow browser uploads to the
// bucket. Origins come from APP_ORIGINS (comma-separated) or default to the
// current Vercel URL. Re-visit after adding a custom domain.
export async function GET() {
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
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const origins = (process.env.APP_ORIGINS || "https://mycbct-portal.vercel.app")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await setBucketCors(origins);
    return NextResponse.json({ ok: true, allowedOrigins: origins });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Could not set CORS" },
      { status: 500 }
    );
  }
}
