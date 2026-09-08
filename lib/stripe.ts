import crypto from "node:crypto";

// Stripe, over the REST API with fetch.
//
// Deliberately no SDK. Resend is already called this way, it keeps the
// dependency list short, and Checkout needs exactly two calls. Card details
// never touch this site — the patient goes to Stripe's own hosted page, which
// also gives them Apple Pay and Google Pay on a phone.
//
// STRIPE_SECRET_KEY starts sk_test_ while testing and sk_live_ when real.
// Nothing here changes when you switch; only the key does.
//
// v2 — send Stripe-Version on every call.
//
// Stripe sets an account's default API version on its first ever API request.
// A brand new account that has never made one has no default, and every raw
// REST call is rejected with "You did not provide an API version". An SDK
// hides this by always sending the header; we send it ourselves. Pinning it
// also means a future Stripe release can't quietly change our responses.

const API = "https://api.stripe.com/v1";

// Stripe's current release. Safe to leave alone; only change it deliberately.
const API_VERSION = "2026-08-26.dahlia";

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

function key() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("STRIPE_SECRET_KEY is not set");
  return k;
}

function headers(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${key()}`,
    "Stripe-Version": API_VERSION,
    ...(extra || {}),
  };
}

// Stripe takes form-encoded bodies, including for nested fields.
function encode(obj: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") p.append(k, String(v));
  }
  return p.toString();
}

export type CheckoutSession = { id: string; url: string };

export async function createCheckoutSession(opts: {
  amountPence: number;
  description: string;
  referralId: string;
  patientEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  const body = encode({
    mode: "payment",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "gbp",
    "line_items[0][price_data][unit_amount]": opts.amountPence,
    "line_items[0][price_data][product_data][name]": opts.description,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer_email: opts.patientEmail || undefined,
    "metadata[referral_id]": opts.referralId,
    // Shown on the patient's bank statement. Stripe allows 22 characters.
    "payment_intent_data[statement_descriptor_suffix]": "CBCT SCAN",
  });

  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/x-www-form-urlencoded" }),
    body,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || "Stripe would not start a payment.");
  }
  return { id: json.id, url: json.url };
}

export async function getCheckoutSession(sessionId: string) {
  const res = await fetch(`${API}/checkout/sessions/${sessionId}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || "Could not read that payment.");
  }
  return json as {
    id: string;
    payment_status: string;
    payment_intent: string | null;
    amount_total: number;
    metadata?: { referral_id?: string };
  };
}

// Verify a Stripe webhook signature. Without this anyone who found the URL
// could tell us a payment had succeeded.
export function verifyWebhook(
  payload: string,
  header: string | null,
  secret: string
): boolean {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i), p.slice(i + 1)];
    })
  ) as { t?: string; v1?: string };

  if (!parts.t || !parts.v1) return false;

  // Reject anything more than five minutes old, so a captured request can't
  // be replayed later.
  const age = Math.abs(Date.now() / 1000 - Number(parts.t));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${payload}`, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parts.v1, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
