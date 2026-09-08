import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyWebhook } from "@/lib/stripe";

// Stripe tells us here when a payment actually succeeded.
//
// The return URL is not enough on its own: a patient can pay and then close
// the tab before coming back. This runs server to server, so it lands either
// way, and it is the authority on whether a scan has been paid for.
//
// Point Stripe at:  https://www.mycbct.co.uk/api/stripe/webhook
// Listening for:    checkout.session.completed, charge.refunded
// Then put the signing secret (whsec_...) in STRIPE_WEBHOOK_SECRET.

export const dynamic = "force-dynamic";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("stripe webhook: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  // The raw body, exactly as sent — parsing it first would break the signature.
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!verifyWebhook(raw, sig, secret)) {
    console.error("stripe webhook: bad signature");
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const db = admin();
  if (!db) {
    console.error("stripe webhook: no service role key");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const obj = (event.data?.object || {}) as Record<string, unknown>;

  try {
    if (event.type === "checkout.session.completed") {
      const sessionId = String(obj.id || "");
      const paid = String(obj.payment_status || "") === "paid";
      const intent =
        typeof obj.payment_intent === "string" ? obj.payment_intent : null;

      if (sessionId && paid) {
        await db
          .from("payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent: intent,
          })
          .eq("stripe_session_id", sessionId);
      }
    }

    if (event.type === "charge.refunded") {
      const intent =
        typeof obj.payment_intent === "string" ? obj.payment_intent : null;
      if (intent) {
        await db
          .from("payments")
          .update({ status: "refunded", refunded_at: new Date().toISOString() })
          .eq("stripe_payment_intent", intent);
      }
    }
  } catch (e) {
    // Tell Stripe it failed so it retries, rather than losing the payment.
    console.error("stripe webhook: could not record", event.type, e);
    return NextResponse.json({ error: "could not record" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
