import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReferralForm from "@/components/ReferralForm";

// v4 — the report fee comes from the scan type, not a constant.
// REPORT_FEE_PENCE was hardcoded at 12000, so the form quoted £120 for every
// report no matter the scan size — which is what Rachel saw after the 4 Sept
// price change. RA-Dental charge by volume, so each scan type now carries its
// own report price and the form reads it.
//
// v3.1 — staff get the practice list for the picker (plain JS).
// Staff/admin can always open the form (their profile has no practice;
// they choose one per referral). Dentists work exactly as before.
// Still hides any scan type whose name contains "historical".

// Fallback only — used if a scan type somehow has no report price set.
// The largest volume, so we never quote under cost.
const REPORT_FEE_FALLBACK_PENCE = 16500;

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
  let practices = [];
  if (isStaff) {
    const { data: rows } = await supabase
      .from("practices")
      .select("id, name")
      .order("name");
    practices = rows || [];
  }

  const { data: scanTypeRows } = await supabase
    .from("scan_types")
    .select("id, code, name, description, base_price, report_price_pence")
    .eq("active", true)
    .eq("is_addon", false)
    .neq("code", "ios")
    .order("sort_order");

  const scanTypes = (scanTypeRows || []).filter(
    (st) => !st.name?.toLowerCase().includes("historical")
  );

  return (
    <ReferralForm
      hasPractice={isStaff || !!profile?.practice_id}
      practiceName={practiceName}
      dentistName={profile?.full_name || profile?.email || ""}
      scanTypes={scanTypes}
      reportFeePence={REPORT_FEE_FALLBACK_PENCE}
      isStaff={isStaff}
      practices={practices}
    />
  );
}
