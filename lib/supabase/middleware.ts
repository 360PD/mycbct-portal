import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that require a signed-in user.
const PROTECTED_PREFIXES = ["/dashboard", "/refer", "/referrals"];

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // If Supabase isn't configured yet, don't crash the whole site.
  // Public pages still render; protected pages guard themselves server-side.
  if (!url || !key) {
    console.warn(
      "[middleware] Supabase env vars missing - skipping auth. Set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel."
    );
    return NextResponse.next({ request });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: getClaims() validates the JWT. Never trust getSession() here.
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    const path = request.nextUrl.pathname;
    const isProtected = PROTECTED_PREFIXES.some(
      (p) => path === p || path.startsWith(p + "/")
    );

    if (!claims && isProtected) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/sign-in";
      redirectUrl.searchParams.set("next", path);
      redirectUrl.searchParams.set(
        "notice",
        path.startsWith("/refer")
          ? "Please sign in to refer a patient."
          : "Please sign in to continue."
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Always return supabaseResponse so refreshed auth cookies are passed along.
    return supabaseResponse;
  } catch (err) {
    // Never take the whole site down because of an auth hiccup.
    console.error("[middleware] auth check failed:", err);
    return NextResponse.next({ request });
  }
}
