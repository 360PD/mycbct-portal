import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/sign-in?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, email")
    .eq("id", claims.sub)
    .single();

  const name = profile?.full_name || claims.email || "there";
  const role = profile?.role || "dentist";
  const email = profile?.email || claims.email || "";

  return (
    <main className="db-root">
      <style>{`
        .db-root{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:"DM Sans",system-ui,sans-serif;padding:0;}
        .db-bar{display:flex;align-items:center;justify-content:space-between;
          padding:20px clamp(20px,5vw,56px);border-bottom:1px solid rgba(231,174,59,.18);}
        .db-brand{font-family:"Fraunces",Georgia,serif;font-size:22px;font-weight:600;
          letter-spacing:.2px;}
        .db-brand .by{display:block;font-family:"DM Sans",sans-serif;font-size:11px;
          letter-spacing:.16em;text-transform:uppercase;color:#e7ae3b;margin-top:2px;}
        .db-out{appearance:none;border:1px solid rgba(247,244,236,.28);background:transparent;
          color:#f7f4ec;font:inherit;font-size:14px;padding:9px 16px;border-radius:999px;cursor:pointer;}
        .db-out:hover{border-color:#e7ae3b;color:#e7ae3b;}
        .db-wrap{max-width:760px;margin:0 auto;padding:clamp(36px,7vw,72px) clamp(20px,5vw,56px);}
        .db-hi{font-family:"Fraunces",Georgia,serif;font-size:clamp(28px,5vw,40px);
          line-height:1.1;margin:0 0 10px;}
        .db-sub{color:rgba(247,244,236,.72);font-size:16px;margin:0 0 8px;}
        .db-meta{color:rgba(247,244,236,.5);font-size:13px;margin:0 0 36px;}
        .db-meta b{color:#e7ae3b;font-weight:600;text-transform:capitalize;}
        .db-card{background:rgba(247,244,236,.04);border:1px solid rgba(231,174,59,.18);
          border-radius:16px;padding:28px;}
        .db-card h2{font-family:"Fraunces",Georgia,serif;font-size:20px;margin:0 0 8px;}
        .db-card p{color:rgba(247,244,236,.7);font-size:15px;margin:0 0 20px;line-height:1.5;}
        .db-cta{display:inline-block;background:#e7ae3b;color:#0e1b2e;font-weight:600;
          font-size:15px;text-decoration:none;padding:13px 26px;border-radius:999px;}
        .db-cta:hover{filter:brightness(1.05);}
      `}</style>

      <header className="db-bar">
        <div className="db-brand">
          MyCBCT
          <span className="by">by 360 Visualise</span>
        </div>
        <form action="/auth/sign-out" method="post">
          <button className="db-out" type="submit">Sign out</button>
        </form>
      </header>

      <div className="db-wrap">
        <h1 className="db-hi">Welcome back, {name}.</h1>
        <p className="db-sub">You're signed in to the MyCBCT referral portal.</p>
        <p className="db-meta">
          Signed in as {email} &middot; role: <b>{role}</b>
        </p>

        <section className="db-card">
          <h2>Refer a patient</h2>
          <p>
            Send a new CBCT referral to 360 Visualise. Your scan and any report
            come straight back to you here.
          </p>
          <a className="db-cta" href="/refer">New referral</a>
        </section>
      </div>
    </main>
  );
}
