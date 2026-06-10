import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Practices overview — staff/admin only.
// Lists every practice with its dentist-login count and referral count.
// Clicking a practice opens the dashboard filtered to it.

export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

function countOf(v) {
  if (Array.isArray(v)) return v[0]?.count ?? 0;
  return v?.count ?? 0;
}

export default async function PracticesPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/sign-in?next=/practices");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();
  const role = me?.role;
  if (role !== "staff" && role !== "admin") redirect("/dashboard");

  const admin = adminClient();
  let practices = [];
  if (admin) {
    const { data: rows } = await admin
      .from("practices")
      .select("id, name, profiles(count), referrals(count)")
      .order("name", { ascending: true });
    practices = (rows || []).map((p) => ({
      id: p.id,
      name: p.name,
      dentists: countOf(p.profiles),
      referrals: countOf(p.referrals),
    }));
  }

  const totalDentists = practices.reduce((n, p) => n + p.dentists, 0);
  const totalReferrals = practices.reduce((n, p) => n + p.referrals, 0);

  return (
    <main className="pr-root">
      <style>{`
        .pr-root{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:"DM Sans",system-ui,sans-serif;}
        .pr-bar{display:flex;align-items:center;justify-content:space-between;
          padding:20px clamp(20px,5vw,56px);border-bottom:1px solid rgba(231,174,59,.18);}
        .pr-brand{font-family:"Fraunces",Georgia,serif;font-size:22px;font-weight:600;letter-spacing:.2px;}
        .pr-brand .by{display:block;font-family:"DM Sans",sans-serif;font-size:11px;
          letter-spacing:.16em;text-transform:uppercase;color:#e7ae3b;margin-top:2px;}
        .pr-back{color:rgba(247,244,236,.7);text-decoration:none;font-size:14px;}
        .pr-back:hover{color:#e7ae3b;}
        .pr-wrap{max-width:880px;margin:0 auto;padding:clamp(32px,6vw,60px) clamp(20px,5vw,56px);}
        .pr-h1{font-family:"Fraunces",Georgia,serif;font-size:clamp(26px,4.5vw,36px);margin:0 0 8px;}
        .pr-meta{color:rgba(247,244,236,.5);font-size:14px;margin:0 0 32px;}
        .pr-head-actions{display:flex;justify-content:flex-end;margin:0 0 16px;}
        .pr-add{display:inline-block;background:transparent;color:#e7ae3b;font-weight:600;font-size:14.5px;
          text-decoration:none;padding:10px 20px;border-radius:999px;border:1px solid rgba(231,174,59,.5);}
        .pr-add:hover{background:rgba(231,174,59,.1);}
        .pr-list{border:1px solid rgba(231,174,59,.16);border-radius:16px;overflow:hidden;}
        .pr-row{display:grid;grid-template-columns:2.2fr .8fr .8fr;gap:12px;align-items:center;
          padding:15px 20px;border-bottom:1px solid rgba(247,244,236,.07);font-size:15px;}
        .pr-row:last-child{border-bottom:none;}
        a.pr-row{color:inherit;text-decoration:none;transition:background .12s ease;}
        a.pr-row:hover{background:rgba(247,244,236,.05);}
        .pr-row.head{background:rgba(247,244,236,.04);font-size:12px;letter-spacing:.12em;
          text-transform:uppercase;color:rgba(247,244,236,.5);font-weight:600;}
        .pr-name{font-weight:600;}
        .pr-n{color:rgba(247,244,236,.75);}
        .pr-zero{color:rgba(247,244,236,.35);}
        .pr-pill{display:inline-block;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;
          background:rgba(231,174,59,.16);color:#e7ae3b;margin-left:8px;}
        @media(max-width:560px){
          .pr-row{grid-template-columns:1.6fr .7fr .7fr;font-size:14px;padding:13px 14px;}
        }
      `}</style>

      <header className="pr-bar">
        <div className="pr-brand">MyCBCT<span className="by">by 360 Visualise</span></div>
        <a className="pr-back" href="/dashboard">&larr; Dashboard</a>
      </header>

      <div className="pr-wrap">
        <h1 className="pr-h1">Practices</h1>
        <p className="pr-meta">
          {practices.length} practices &middot; {totalDentists} dentist logins &middot;{" "}
          {totalReferrals.toLocaleString("en-GB")} referrals. Click a practice to see its referrals.
        </p>

        <div className="pr-head-actions">
          <a className="pr-add" href="/add-dentist">Add a dentist</a>
        </div>

        <div className="pr-list">
          <div className="pr-row head">
            <span>Practice</span>
            <span>Dentists</span>
            <span>Referrals</span>
          </div>
          {practices.map((p) => (
            <a className="pr-row" key={p.id} href={"/dashboard?practice=" + p.id}>
              <span className="pr-name">
                {p.name}
                {p.dentists === 0 && <span className="pr-pill">No logins yet</span>}
              </span>
              <span className={p.dentists ? "pr-n" : "pr-zero"}>{p.dentists}</span>
              <span className="pr-n">{p.referrals.toLocaleString("en-GB")}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
