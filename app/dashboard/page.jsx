import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// v3 — staff action queue + at-a-glance stats.
// Staff/admin see: action queue (unscanned referrals, oldest first),
// three at-a-glance numbers, an Add-a-dentist button, and recent referrals.
// Dentists see the same practice-scoped view as v2 — unchanged.

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

const DAY = 24 * 60 * 60 * 1000;

function daysWaiting(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

function waitLabel(d) {
  if (d <= 0) return "Today";
  if (d === 1) return "1 day";
  return d + " days";
}

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

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ---------- Shared: recent referrals list ----------
  // RLS limits dentists to their own practice; staff/admin see everything.
  const { data: referrals } = await supabase
    .from("referrals")
    .select(
      "id, status, created_at, report_requested, signature_name, " +
        "patients(first_name, last_name), scan_types(name), practices(name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (referrals || []).map((r) => {
    const pat = one(r.patients);
    const st = one(r.scan_types);
    const pr = one(r.practices);
    return {
      id: r.id,
      status: r.status,
      reportRequested: !!r.report_requested,
      created: r.created_at,
      patientName: pat ? `${pat.first_name} ${pat.last_name}` : "—",
      scanType: st?.name || "—",
      practice: pr?.name || "—",
      referredBy: r.signature_name || "—",
    };
  });

  // ---------- Staff only: action queue + stats ----------
  let queue = [];
  let stats = null;
  if (isStaff) {
    // The worklist: referrals not yet scanned. Oldest first — first in,
    // first scanned. A referral leaves the queue the moment a scan exists.
    const { data: pending } = await supabase
      .from("referrals")
      .select(
        "id, status, created_at, " +
          "patients(first_name, last_name), scan_types(name), practices(name), scans(id)"
      )
      .in("status", ["submitted", "booked"])
      .order("created_at", { ascending: true })
      .limit(100);

    queue = (pending || [])
      .filter((r) => !(r.scans || []).length)
      .map((r) => {
        const pat = one(r.patients);
        const st = one(r.scan_types);
        const pr = one(r.practices);
        const d = daysWaiting(r.created_at);
        return {
          id: r.id,
          patientName: pat ? `${pat.first_name} ${pat.last_name}` : "—",
          scanType: st?.name || "—",
          practice: pr?.name || "—",
          days: d,
          urgency: d >= 7 ? "red" : d >= 3 ? "amber" : "",
        };
      });

    const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
    const [{ count: refsWeek }, { count: scansWeek }] = await Promise.all([
      supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      supabase
        .from("scans")
        .select("id", { count: "exact", head: true })
        .gte("uploaded_at", weekAgo),
    ]);

    stats = {
      awaiting: queue.length,
      refsWeek: refsWeek ?? 0,
      scansWeek: scansWeek ?? 0,
    };
  }

  const listHeading = isStaff
    ? "Recent referrals"
    : practiceName
      ? `Referrals at ${practiceName}`
      : "Your referrals";

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
        .db-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px;flex-wrap:wrap;}
        .db-head h2{font-family:"Fraunces",Georgia,serif;font-size:22px;margin:0;}
        .db-actions{display:flex;gap:10px;flex-wrap:wrap;}
        .db-new{display:inline-block;background:#e7ae3b;color:#0e1b2e;font-weight:600;font-size:15px;
          text-decoration:none;padding:11px 22px;border-radius:999px;white-space:nowrap;}
        .db-new:hover{filter:brightness(1.05);}
        .db-new.ghost{background:transparent;color:#e7ae3b;border:1px solid rgba(231,174,59,.5);}
        .db-new.ghost:hover{background:rgba(231,174,59,.1);}
        .db-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:0 0 36px;}
        .db-stat{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.09);
          border-radius:16px;padding:18px 20px;}
        .db-stat .n{font-family:"Fraunces",Georgia,serif;font-size:32px;line-height:1;color:#e7ae3b;}
        .db-stat .l{font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;
          color:rgba(247,244,236,.5);margin-top:8px;}
        @media(max-width:640px){.db-stats{grid-template-columns:1fr;}}
        .db-empty{background:rgba(247,244,236,.04);border:1px dashed rgba(231,174,59,.3);
          border-radius:16px;padding:40px 28px;text-align:center;color:rgba(247,244,236,.7);}
        .db-empty p{margin:0 0 18px;font-size:15px;}
        .db-empty.ok{border-color:rgba(54,184,134,.4);color:#9fe2c3;padding:26px 28px;}
        .db-empty.ok p{margin:0;}
        .db-list{border:1px solid rgba(231,174,59,.16);border-radius:16px;overflow:hidden;margin-bottom:44px;}
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
        .db-wait{display:inline-block;font-size:12.5px;font-weight:600;padding:4px 11px;border-radius:999px;
          background:rgba(247,244,236,.1);color:rgba(247,244,236,.75);}
        .db-wait.amber{background:rgba(231,174,59,.2);color:#e7ae3b;}
        .db-wait.red{background:rgba(255,110,110,.18);color:#ff9b9b;}
        .db-up{flex:none;font-size:13.5px;font-weight:600;color:#e7ae3b;}
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

        {/* ================= STAFF / ADMIN VIEW ================= */}
        {isStaff && (
          <>
            <div className="db-stats">
              <div className="db-stat">
                <div className="n">{stats.awaiting}</div>
                <div className="l">Awaiting scan</div>
              </div>
              <div className="db-stat">
                <div className="n">{stats.refsWeek}</div>
                <div className="l">Referrals this week</div>
              </div>
              <div className="db-stat">
                <div className="n">{stats.scansWeek}</div>
                <div className="l">Scans uploaded this week</div>
              </div>
            </div>

            <div className="db-head">
              <h2>Action queue</h2>
              <div className="db-actions">
                <a className="db-new ghost" href="/add-dentist">Add a dentist</a>
                <a className="db-new" href="/refer">New referral</a>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="db-empty ok" style={{ marginBottom: "44px" }}>
                <p>All caught up — every referral has its scan. &#10003;</p>
              </div>
            ) : (
              <div className="db-list">
                <div className="db-row head">
                  <span>Patient</span>
                  <span className="db-type">Scan</span>
                  <span className="db-who">Practice</span>
                  <span>Waiting</span>
                  <span className="db-when"></span>
                </div>
                {queue.map((q) => (
                  <a className="db-row" key={q.id} href={"/referrals/" + q.id}>
                    <span className="db-pat">{q.patientName}</span>
                    <span className="db-type">{q.scanType}</span>
                    <span className="db-who db-sub">{q.practice}</span>
                    <span>
                      <span className={"db-wait " + q.urgency}>{waitLabel(q.days)}</span>
                    </span>
                    <span className="db-when db-up">Upload scan &rarr;</span>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= REFERRALS LIST (both roles) ================= */}
        <div className="db-head">
          <h2>{listHeading}</h2>
          {!isStaff && <a className="db-new" href="/refer">New referral</a>}
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
              <span className="db-who">{isStaff ? "Practice" : "Referred by"}</span>
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
                <span className="db-who db-sub">{isStaff ? r.practice : r.referredBy}</span>
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
