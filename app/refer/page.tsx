import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ReferPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect("/sign-in?next=/refer&notice=Please sign in to refer a patient.");
  }

  return (
    <main className="rf-root">
      <style>{`
        .rf-root{min-height:100vh;background:#f7f4ec;color:#0e1b2e;
          font-family:"DM Sans",system-ui,sans-serif;display:flex;align-items:center;
          justify-content:center;padding:40px 20px;}
        .rf-card{max-width:520px;text-align:center;background:#fff;border:1px solid rgba(14,27,46,.1);
          border-radius:18px;padding:clamp(32px,6vw,52px);box-shadow:0 18px 50px -28px rgba(14,27,46,.4);}
        .rf-card h1{font-family:"Fraunces",Georgia,serif;font-size:clamp(24px,5vw,32px);margin:0 0 12px;}
        .rf-card p{color:rgba(14,27,46,.66);font-size:16px;line-height:1.55;margin:0 0 26px;}
        .rf-back{display:inline-block;background:#0e1b2e;color:#f7f4ec;font-weight:600;
          text-decoration:none;font-size:15px;padding:12px 24px;border-radius:999px;}
        .rf-back:hover{background:#16284180;}
        .rf-tag{display:inline-block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
          color:#e7ae3b;font-weight:600;margin-bottom:14px;}
      `}</style>
      <div className="rf-card">
        <span className="rf-tag">Protected page &middot; you're signed in</span>
        <h1>Referral form</h1>
        <p>
          This is where the referral form lives. It's gated &mdash; only signed-in
          dentists reach this page. The full form gets wired to your database next.
        </p>
        <a className="rf-back" href="/dashboard">Back to dashboard</a>
      </div>
    </main>
  );
}
