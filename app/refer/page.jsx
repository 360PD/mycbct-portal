import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReferralForm from "@/components/ReferralForm";

// v2 — hides the legacy "CBCT — historical" type from the picker.
// The type stays in the database (2,343 migrated scans point at it);
// it's only excluded from the choices a dentist can pick.

export default async function ReferPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) {
    redirect("/sign-in?next=/refer&notice=Please sign in to refer a patient.");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("practice_id, full_name, email")
    .eq("id", claims.sub)
    .single();
  let practiceName = null;
  if (profile?.practice_id) {
    const { data: practice } = await supabase
      .from("practices")
      .select("name")
      .eq("id", profile.practice_id)
      .single();
    practiceName = practice?.name ?? null;
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
      hasPractice={!!profile?.practice_id}
      practiceName={practiceName}
      dentistName={profile?.full_name || profile?.email || ""}
      scanTypes={scanTypes || []}
    />
  );
}
