"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// v2 — adds the chase state alongside the notes.
// A referral that is waiting on somebody is in a state, not a note. The old
// system had no field for it, so staff wrote "con 22.4" into the clinical
// notes; 168 referrals then sat in a queue nobody could read without a regex.
// Setting the state also writes a line into the thread, so the notes stay the
// full history of what happened and when.
//
// v1 — staff notes on a referral.
//
// Notes and states are staff-only. The RLS policies on referral_notes
// ("staff read notes" / "staff write notes") enforce that in the database —
// the checks below just give a clean error instead of a policy failure.

export type NoteResult = { ok: true } | { ok: false; error: string };

const MAX_NOTE = 4000;

export const CHASE_STATES = [
  "waiting_patient",
  "waiting_dentist",
  "ready_to_book",
] as const;

export type ChaseState = (typeof CHASE_STATES)[number];

const CHASE_LABEL: Record<string, string> = {
  waiting_patient: "Waiting on the patient",
  waiting_dentist: "Waiting on the dentist",
  ready_to_book: "Ready to book",
};

// Shared gate: signed in, and staff or admin.
async function requireStaff() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims) return { error: "You're not signed in." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub as string)
    .maybeSingle();

  const role = profile?.role;
  if (role !== "staff" && role !== "admin") {
    return { error: "Only the 360 Visualise team can do that." as const };
  }

  return { supabase, userId: claims.sub as string };
}

export async function addReferralNote(
  referralId: string,
  body: string
): Promise<NoteResult> {
  const text = String(body || "").trim();
  if (!referralId) return { ok: false, error: "Missing referral." };
  if (!text) return { ok: false, error: "Type a note first." };
  if (text.length > MAX_NOTE) {
    return { ok: false, error: "That note is too long — keep it under 4,000 characters." };
  }

  const gate = await requireStaff();
  if ("error" in gate) return { ok: false, error: gate.error };

  const { error } = await gate.supabase.from("referral_notes").insert({
    referral_id: referralId,
    author_id: gate.userId,
    body: text,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/referrals/" + referralId);
  revalidatePath("/dashboard");
  return { ok: true };
}

// Set (or clear) where a referral is stuck. Clearing passes null.
// The change is recorded in the thread so the history stays in one place.
export async function setChaseState(
  referralId: string,
  state: string | null
): Promise<NoteResult> {
  if (!referralId) return { ok: false, error: "Missing referral." };

  const next =
    state === null || state === "" ? null : String(state);
  if (next !== null && !CHASE_STATES.includes(next as ChaseState)) {
    return { ok: false, error: "That isn't a state we recognise." };
  }

  const gate = await requireStaff();
  if ("error" in gate) return { ok: false, error: gate.error };

  const { data: before } = await gate.supabase
    .from("referrals")
    .select("chase_state")
    .eq("id", referralId)
    .maybeSingle();

  // Nothing to do — don't write a note for a no-op.
  if ((before?.chase_state ?? null) === next) return { ok: true };

  const { error } = await gate.supabase
    .from("referrals")
    .update({ chase_state: next })
    .eq("id", referralId);

  if (error) return { ok: false, error: error.message };

  // Best-effort audit line. A failure here must not undo the state change.
  const line = next
    ? "Marked: " + (CHASE_LABEL[next] || next)
    : "Cleared the chase state";
  await gate.supabase.from("referral_notes").insert({
    referral_id: referralId,
    author_id: gate.userId,
    body: line,
  });

  revalidatePath("/referrals/" + referralId);
  revalidatePath("/dashboard");
  return { ok: true };
}
