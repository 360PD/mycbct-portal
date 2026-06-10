import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Handles auth links arriving from email.
// Supports BOTH styles:
//  1. PKCE links:        /auth/callback?code=...&next=/dashboard
//  2. Token-hash links:  /auth/callback?token_hash=...&type=invite&next=/auth/set-password
// Token-hash links are what the Supabase email templates send when the
// template uses {{ .TokenHash }} — these are server-readable, unlike the
// default links that hide the token in a # fragment.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // Style 1: PKCE code exchange (magic links, OAuth).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Style 2: token-hash verification (invites, password resets).
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/sign-in?notice=${encodeURIComponent(
      "That link was invalid or has expired. Please try again."
    )}`
  );
}
