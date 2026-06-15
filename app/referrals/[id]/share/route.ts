import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const expires_at = new Date();
  expires_at.setDate(expires_at.getDate() + 14);

  const { data, error } = await supabase
    .from("share_tokens")
    .insert({
      referral_id: id,
      created_by: auth.claims.sub,
      expires_at: expires_at.toISOString(),
    })
    .select("token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/share/${data.token}`;
  return NextResponse.json({ url });
}
