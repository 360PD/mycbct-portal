import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// v7 — action queue shows appointment times and Book buttons.
// Unbooked queue rows get a gold Book button straight to the booking
// calendar; booked rows show their appointment time. Otherwise v6.

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

function fmtShortAppt(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Strip characters that would break the PostgREST or() filter string.
function cleanSearch(s) {
  return String(s || "").replace(/[,%()]/g, " ").trim();
}

export default async function DashboardPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const q = cleanSearch(sp.q);
  const statusFilter = String(sp.status || "").trim();
  const practiceFilter = String(sp.practice || "").trim();
  const filtering = !!(q || statusFilter || practiceFilter);

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

  // ---------- Referrals list (searchable for staff) ----------
  // If searching by patient name, find matching patient ids first — this is
  // the reliable way to search an embedded relationship server-side.
  let patientIds = null;
  if (isStaff && q) {
    const { data: pats } = await supabase
      .from("patients")
      .select("id")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(500);
    patientIds = (pats || []).map((p) => p.id);
  }

  let rows = [];
  let noMatches = false;
  if (patientIds && patientIds.length === 0) {
    noMatches = true;
  } else {
    let query = supabase
      .from("referrals")
      .select(
        "id, status, created_at, report_requested, signature_name, " +
          "patients(first_name, last_name), scan_types(name), practices(name)"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (patientIds) query = query.in("patient_id", patientIds);
    if (isStaff && statusFilter) query = query.eq("status", statusFilter);
    if (isStaff && practiceFilter) query = query.eq("practice_id", practiceFilter);

    const { data: referrals } = await query;
    rows = (referrals || []).map((r) => {
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
  }

  // ---------- Staff only: queue, stats, practices for the filter ----------
  let queue = [];
  let stats = null;
  let practiceOptions = [];
  if (isStaff) {
    const { data: pending } = await supabase
      .from("referrals")
      .select(
        "id, status, created_at, " +
          "patients(first_name, last_name), scan_types(name), practices(name), scans(id), " +
          "appointments(starts_at, status)"
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
        const appt = (r.appointments || []).find((a) => a.status === "booked") || null;
        return {
          id: r.id,
          patientName: pat ? `${pat.first_name} ${pat.last_name}` : "—",
          scanType: st?.name || "—",
          practice: pr?.name || "—",
          days: d,
          urgency: d >= 7 ? "red" : d >= 3 ? "amber" : "",
          apptAt: appt ? appt.starts_at : null,
        };
      });

    const weekAgo = new Date(Date.now() - 7 * DAY).toISOString();
    const [{ count: refsWeek }, { count: scansWeek }, practicesRes] =
      await Promise.all([
        supabase
          .from("referrals")
          .select("id", { count: "exact", head: true })
          .gte("created_at", weekAgo),
        supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .gte("uploaded_at", weekAgo),
        supabase.from("practices").select("id, name").order("name"),
      ]);

    stats = {
      awaiting: queue.length,
      refsWeek: refsWeek ?? 0,
      scansWeek: scansWeek ?? 0,
    };
    practiceOptions = practicesRes.data || [];
  }

  const listHeading = isStaff
    ? filtering
      ? "Search results"
      : "Recent referrals"
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
        .db-count{font-family:"DM Sans",sans-serif;font-size:14px;color:rgba(247,244,236,.5);font-weight:400;}
        .db-clear{font-size:14px;color:#e7ae3b;text-decoration:none;margin-left:10px;}
        .db-clear:hover{text-decoration:underline;}
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
        .db-search{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 18px;}
        .db-search input,.db-search select{background:#13233c;border:1px solid rgba(247,244,236,.18);
          border-radius:999px;padding:11px 18px;color:#f7f4ec;font:inherit;font-size:14.5px;}
        .db-search input{flex:1;min-width:200px;}
        .db-search input::placeholder{color:rgba(247,244,236,.4);}
        .db-search input:focus,.db-search select:focus{outline:none;border-color:#e7ae3b;}
        .db-search select{cursor:pointer;max-width:260px;}
        .db-search button{appearance:none;border:none;background:#e7ae3b;color:#0e1b2e;font:inherit;
          font-weight:600;font-size:14.5px;padding:11px 24px;border-radius:999px;cursor:pointer;}
        .db-search button:hover{filter:brightness(1.05);}
        .db-empty{background:rgba(247,244,236,.04);border:1px dashed rgba(231,174,59,.3);
          border-radius:16px;padding:40px 28px;text-align:center;color:rgba(247,244,236,.7);}
        .db-empty p{margin:0 0 18px;font-size:15px;}
        .db-empty p:last-child{margin-bottom:0;}
        .db-empty.ok{border-color:rgba(54,184,134,.4);color:#9fe2c3;padding:26px 28px;}
        .db-empty.ok p{margin:0;}
        .db-list{border:1px solid rgba(231,174,59,.16);border-radius:16px;overflow:hidden;margin-bottom:44px;}
        .db-row{display:grid;grid-template-columns:1.4fr 1fr 1fr .9fr 1fr;gap:12px;align-items:center;
          padding:16px 20px;border-bottom:1px solid rgba(247,244,236,.07);font-size:15px;
          position:relative;}
        .db-row:last-child{border-bottom:none;}
        a.db-row{color:inherit;text-decoration:none;cursor:pointer;transition:background .12s ease;}
        a.db-row:hover{background:rgba(247,244,236,.05);}
        .db-row.linked{transition:background .12s ease;}
        .db-row.linked:hover{background:rgba(247,244,236,.05);}
        .db-rowlink{position:absolute;inset:0;z-index:0;}
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
        .db-book{position:relative;z-index:1;display:inline-block;background:#e7ae3b;color:#0e1b2e;
          font-weight:600;font-size:13px;text-decoration:none;padding:7px 16px;border-radius:999px;
          white-space:nowrap;justify-self:start;}
        .db-book:hover{filter:brightness(1.05);}
        .db-appt{font-size:13.5px;font-weight:600;color:#e7ae3b;white-space:nowrap;}
        @media(max-width:720px){
          .db-row{grid-template-columns:1fr auto;}
          .db-row .db-when,.db-row .db-type,.db-row .db-who{display:none;}
          .db-row.head{display:none;}
        }
      `}</style>

      <header className="db-bar">
        <div className="db-brand">MyCBCT<span className="by">by 360 Visualise</span></div>
        <form action="/auth/sign-out" method="post">
          <button classNa
