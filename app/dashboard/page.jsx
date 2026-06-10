import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// v2 — practice-named heading + "Referred by" column.

// Supabase embeds can come back as an object or a single-item array
// depending on how it reads the relationship; normalise to one record.
function one(v) {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

const STATUS_LABEL = {
  submitted: "Submitted",
  booked: "Booked",
  scanned: "Scanned",
  delivered: "Delivered",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/sign-in?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, email, practices(name)")
    .eq("id", claims.sub)
    .single();

  const name = profile?.full_name || claims.email || "there";
  const role = profile?.role || "dentist";
  const email = profile?.email || claims.email || "";
  const practiceName = one(profile?.practices)?.name || null;
  const isStaff = role === "staff" || role === "admin";

  // The list heading: dentists are scoped to one practice (by RLS), so name
  // it honestly — these are the practice's referrals, not just theirs.
  const listHeading = isStaff
    ? "All referrals"
    : practiceName
      ? `Referrals at ${practiceName}`
      : "Your referrals";

  // RLS automatically limits this to the dentist's own practice.
  const { data: referrals } = await supabase
    .from("referrals")
    .select(
      "id, status, created_at, report_requested, signature_name, patients(first_name, last_name), scan_types(name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (referrals || []).map((r) => {
    const pat = one(r.patients);
    const st = one(r.scan_types);
    return {
      id: r.id,
      status: r.status,
      reportRequested: !!r.report_requested,
      created: r.created_at,
      patientName: pat ? `${pat.first_name} ${pat.last_name}` : "—",
      scanType: st?.name || "—",
      referredBy: r.signature_name || "—",
    };
  });

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <main className="db-root">
      <style>{`
        .db-root{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:"DM Sans",system-ui,sans-serif;}
        .db-bar{display:flex;align-items:center;justify-content:space-between;
          padding:20px clamp(20px,5vw,56px);border-bottom:1px solid rgba(231,174,59,.18);}
        .db-brand{font-family:"Fraunces",Georgia,serif;font-size:22px;font-weight:600;letter-spacing:.2px;}
        .db-brand .by{display:block;font-family:"DM Sans",sans-serif;font-size:11px;
          letter-spacing:.16em;text-transform:uppercase;color:#e7ae3b;margin-top:2px;}
        .db-out{appearance:none;border:1px solid rgba(247,244,236,.28);background:transparent;
          color:#f7f4ec;font:inherit;font-size:14px;padding:9px 16px;border-radius:999px;cursor:pointer;}
        .db-out:hover{border-color:#e7ae3b;color:#e7ae3b;}
        .db-wrap{max-width:1020px;margin:0 auto;padding:clamp(32px,6vw,60px) clamp(20px,5vw,56px);}
        .db-hi{font-family:"Fraunces",Georgia,serif;font-size:clamp(26px,4.5vw,38px);line-height:1.1;margin:0 0 8px;}
        .db-meta{color:rgba(247,244,236,.5);font-size:13px;margin:0 0 36px;}
        .db-meta b{color:#e7ae3b;font-weight:600;text-transform:capitalize;}
        .db-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px;}
        .db-head h2{font-family:"Fraunces",Georgia,serif;font-size:22px;margin:0;}
        .db-new{display:inline-block;background:#e7ae3b;color:#0e1b2e;font-weight:600;font-size:15px;
          text-decoration:none;padding:11px 22px;border-radius:999px;white-space:nowrap;}
        .db-new:hover{filter:brightness(1.05);}
        .db-empty{background:rgba(247,244,236,.04);border:1px dashed rgba(231,174,59,.3);
          border-radius:16px;padding:40px 28px;text-align:center;color:rgba(247,244,236,.7);}
        .db-empty p{margin:0 0 18px;font-size:15px;}
        .db-list{border:1px solid rgba(231,174,59,.16);border-radius:16px;overflow:hidden;}
        .db-row{display:grid;grid-template-columns:1.4fr 1fr 1fr .9fr .8fr;gap:12px;align-items:center;
          padding:16px 20px;border-bottom:1px solid rgba(247,244,236,.07);font-size:15px;}
        .db-row:last-child{border-bottom:none;}
        a.db-row{color:inherit;text-decoration:none;cursor:pointer;transition:background .12s ease;}
        a.db-row:hover{background:rgba(247,244,236,.05);}
        .db-row.head{background:rgba(247,244,236,.04);font-size:12px;letter-spacing:.12em;
          text-transform:uppercase;color:rgba(247,244,236,.5);font-weight:600;}
        .db-pat{font-weight:600;}
        .db-sub{color:rgba(247,244,236,.55);font-size:13px;}
        .db-badge{display:inline-block;font-size:12px;font-weight:600;padding:4px 11px;border-radius:999px;
          background:rgba(231,174,59,.16);color:#e7ae3b;}
        .db-badge.delivered{background:rgba(54,184,134,.16);color:#36b886;}
        .db-badge.cancelled{background:rgba(247,244,236,.1);color:rgba(247,244,236,.55);}
        @media(max-width:720px){
          .db-row{grid-template-columns:1fr auto;}
          .db-row .db-when,.db-row .db-type,.db-row .db-who{display:none;}
          .db-row.head{display:none;}
        }
      `}</style>

      <header className="db-bar">
        <div className="db-brand">MyCBCT<span className="by">by 360 Visualise</span></div>
        <form action="/auth/sign-out" method="post">
          <button className="db-out" type="submit">Sign out</button>
        </form>
      </header>

      <div className="db-wrap">
        <h1 className="db-hi">Welcome back, {name}.</h1>
        <p className="db-meta">{email} &middot; role: <b>{role}</b></p>

        <div className="db-head">
          <h2>{listHeading}</h2>
          <a className="db-new" href="/refer">New referral</a>
        </div>

        {rows.length === 0 ? (
          <div className="db-empty">
            <p>No referrals yet. Send your first patient through in under a minute.</p>
            <a className="db-new" href="/refer">Refer a patient</a>
          </div>
        ) : (
          <div className="db-list">
            <div className="db-row head">
              <span>Patient</span>
              <span className="db-type">Scan</span>
              <span className="db-who">Referred by</span>
              <span>Status</span>
              <span className="db-when">Referred</span>
            </div>
            {rows.map((r) => (
              <a className="db-row" key={r.id} href={"/referrals/" + r.id}>
                <span>
                  <span className="db-pat">{r.patientName}</span>
                  {r.reportRequested && <span className="db-sub"> &middot; report requested</span>}
                </span>
                <span className="db-type">{r.scanType}</span>
                <span className="db-who db-sub">{r.referredBy}</span>
                <span>
                  <span className={"db-badge " + r.status}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                </span>
                <span className="db-when db-sub">{fmtDate(r.created)}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
