import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReferralForm from "@/components/ReferralForm";

// v3 — staff get the practice list for the picker.
// Staff/admin can always open the form (their profile has no practice;
// they choose one per referral). Dentists work exactly as before.
// Still hides the legacy "CBCT — historical" type from the picker.

export default async function ReferPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    redirect("/sign-in?next=/refer&notice=Please sign in to refer a patient.");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("practice_id, full_name, email, role")
    .eq("id", claims.sub)
    .single();

  const isStaff = profile?.role === "staff" || profile?.role === "admin";

  let practiceName = null;
  if (profile?.practice_id) {
    const { data: practice } = await supabase
      .from("practices")
      .select("name")
      .eq("id", profile.practice_id)
      .single();
    practiceName = practice?.name ?? null;
  }

  // Staff choose the practice per referral, so load the full list for them.
  let practices: { id: string; name: string }[] = [];
  if (isStaff) {
    const { data: rows } = await supabase
      .from("practices")
      .select("id, name")
      .order("name");
    practices = rows || [];
  }

  const { data: scanTypes } = await supabase
    .from("scan_types")
    .select("id, code, name, description, base_price")
    .eq("active", true)
    .eq("is_addon", false)
    .neq("code", "ios")
    .neq("code", "cbct_historical")
    .order("sort_order");

  return (
    <ReferralForm
      hasPractice={isStaff || !!profile?.practice_id}
      practiceName={practiceName}
      dentistName={profile?.full_name || profile?.email || ""}
      scanTypes={scanTypes || []}
      isStaff={isStaff}
      practices={practices}
    />
  );
}
