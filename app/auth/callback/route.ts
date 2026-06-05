import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles magic-link and password-reset links: exchanges the code for a
// session, then sends the user on to their destination.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
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
