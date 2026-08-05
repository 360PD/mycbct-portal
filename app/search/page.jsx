import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// v1 — admin search across dentists, practices and patients.
//
// Dentists come from the dentist_directory view, which unions referral
// signature names with dentist logins — searching profiles alone would miss
// almost everyone, since only 15 dentists have signed in against 130-odd names
// on referrals.
//
// Staff/admin only. Patients are real patient data, so this page must never be
// reachable by a dentist.

export const dynamic = "force-dynamic";

const LIMIT = 50;

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createAdminClient(url, key, { auth: { persistSession: false } });
}

// Postgrest treats , and ) as syntax inside .or() — strip them from user input.
function safe(term) {
  return term.replace(/[,()%\\]/g, " ").trim();
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function SearchPage({ searchParams }) {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) redirect("/sign-in?next=/search");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();
  const role = me?.role;
  if (role !== "staff" && role !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const raw = (params?.q || "").toString();
  const q = safe(raw);
  const hasQuery = q.length >= 2;

  const admin = adminClient();
  let dentists = [];
  let practices = [];
  let patients = [];
  let configError = !admin;

  if (admin && hasQuery) {
    const like = `%${q}%`;

    const [dentistRes, practiceRes, patientRes] = await Promise.all([
      admin
        .from("dentist_directory")
        .select(
          "display_name, match_key, practice_id, practice_name, referral_count, last_referral_at, profile_id, profile_email"
        )
        .or(`display_name.ilike.${like},profile_email.ilike.${like}`)
        .order("referral_count", { ascending: false })
        .limit(200),

      admin
        .from("practices")
        .select("id, name, city, postcode, email, referrals(count)")
        .or(
          `name.ilike.${like},email.ilike.${like},city.ilike.${like},postcode.ilike.${like}`
        )
        .order("name")
        .limit(LIMIT),

      admin
        .from("patients")
        .select("id, first_name, last_name, date_of_birth, practices(name)")
        .or(`first_name.ilike.${like},last_name.ilike.${like}`)
        .order("last_name")
        .limit(LIMIT),
    ]);

    // Group the dentist rows by name so someone who refers from two practices
    // shows as one person with two practices under them.
    const byName = new Map();
    for (const row of dentistRes.data || []) {
      const key = row.match_key || row.display_name?.toLowerCase() || "";
      if (!byName.has(key)) {
        byName.set(key, {
          name: row.display_name,
          email: row.profile_email || null,
          hasLogin: !!row.profile_id,
          total: 0,
          lastAt: null,
          practices: [],
        });
      }
      const d = byName.get(key);
      d.total += row.referral_count || 0;
      if (row.profile_id) {
        d.hasLogin = true;
        d.email = d.email || row.profile_email;
      }
      if (row.last_referral_at && (!d.lastAt || row.last_referral_at > d.lastAt)) {
        d.lastAt = row.last_referral_at;
      }
      d.practices.push({
        id: row.practice_id,
        name: row.practice_name || "No practice on record",
        count: row.referral_count || 0,
      });
    }
    dentists = [...byName.values()]
      .map((d) => ({
        ...d,
        practices: d.practices.sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, LIMIT);

    practices = (practiceRes.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      where: [p.city, p.postcode].filter(Boolean).join(", "),
      email: p.email,
      referrals: Array.isArray(p.referrals)
        ? p.referrals[0]?.count ?? 0
        : p.referrals?.count ?? 0,
    }));

    patients = (patientRes.data || []).map((p) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" "),
      dob: p.date_of_birth,
      practice: p.practices?.name || "—",
    }));
  }

  const totalHits = dentists.length + practices.length + patients.length;

  return (
    <main className="sr-root">
      <style>{`
        .sr-root{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:"DM Sans",system-ui,sans-serif;}
        .sr-bar{display:flex;align-items:center;justify-content:space-between;
          padding:20px clamp(20px,5vw,56px);border-bottom:1px solid rgba(231,174,59,.18);}
        .sr-brand{font-family:"Fraunces",Georgia,serif;font-size:22px;font-weight:600;letter-spacing:.2px;}
        .sr-brand .by{display:block;font-family:"DM Sans",sans-serif;font-size:11px;
          letter-spacing:.16em;text-transform:uppercase;color:#e7ae3b;margin-top:2px;}
        .sr-back{color:rgba(247,244,236,.7);text-decoration:none;font-size:14px;}
        .sr-back:hover{color:#e7ae3b;}
        .sr-wrap{max-width:880px;margin:0 auto;padding:clamp(32px,6vw,60px) clamp(20px,5vw,56px);}
        .sr-h1{font-family:"Fraunces",Georgia,serif;font-size:clamp(26px,4.5vw,36px);margin:0 0 8px;}
        .sr-meta{color:rgba(247,244,236,.5);font-size:14px;margin:0 0 24px;}
        .sr-form{display:flex;gap:10px;margin:0 0 34px;}
        .sr-input{flex:1;background:rgba(247,244,236,.06);border:1px solid rgba(231,174,59,.28);
          border-radius:999px;padding:14px 22px;color:#f7f4ec;font-size:16px;font-family:inherit;}
        .sr-input::placeholder{color:rgba(247,244,236,.4);}
        .sr-input:focus{outline:none;border-color:#e7ae3b;background:rgba(247,244,236,.09);}
        .sr-go{background:#e7ae3b;color:#0e1b2e;font-weight:700;font-size:15px;border:none;
          border-radius:999px;padding:14px 28px;cursor:pointer;font-family:inherit;}
        .sr-go:hover{filter:brightness(1.07);}
        .sr-sec{margin:0 0 34px;}
        .sr-sech{font-size:12px;letter-spacing:.12em;text-transform:uppercase;
          color:#e7ae3b;font-weight:700;margin:0 0 12px;}
        .sr-list{border:1px solid rgba(231,174,59,.16);border-radius:16px;overflow:hidden;}
        .sr-row{padding:15px 20px;border-bottom:1px solid rgba(247,244,236,.07);font-size:15px;}
        .sr-row:last-child{border-bottom:none;}
        a.sr-row{display:block;color:inherit;text-decoration:none;transition:background .12s ease;}
        a.sr-row:hover{background:rgba(247,244,236,.05);}
        .sr-name{font-weight:600;display:flex;align-items:center;flex-wrap:wrap;gap:8px;}
        .sr-sub{color:rgba(247,244,236,.5);font-size:13.5px;margin-top:3px;}
        .sr-prac{margin-top:9px;display:flex;flex-direction:column;gap:5px;}
        .sr-pracrow{display:flex;justify-content:space-between;gap:12px;align-items:baseline;
          font-size:14px;padding:7px 12px;border-radius:9px;background:rgba(247,244,236,.045);
          color:inherit;text-decoration:none;}
        a.sr-pracrow:hover{background:rgba(231,174,59,.12);}
        .sr-pracn{color:rgba(247,244,236,.9);}
        .sr-praccount{color:rgba(247,244,236,.5);font-size:13px;white-space:nowrap;}
        .sr-pill{display:inline-block;font-size:11.5px;font-weight:700;padding:3px 10px;
          border-radius:999px;letter-spacing:.04em;}
        .sr-pill.login{background:rgba(231,174,59,.16);color:#e7ae3b;}
        .sr-pill.nologin{background:rgba(247,244,236,.09);color:rgba(247,244,236,.55);}
        .sr-pill.warn{background:rgba(231,120,59,.18);color:#f0a878;}
        .sr-empty{color:rgba(247,244,236,.45);font-size:15px;padding:22px 0;}
        .sr-hint{color:rgba(247,244,236,.4);font-size:13.5px;margin-top:26px;line-height:1.6;}
        @media(max-width:560px){
          .sr-form{flex-direction:column;}
          .sr-go{width:100%;}
          .sr-row{padding:13px 14px;}
        }
      `}</style>

      <header className="sr-bar">
        <div className="sr-brand">MyCBCT<span className="by">by 360 Visualise</span></div>
        <a className="sr-back" href="/dashboard">&larr; Dashboard</a>
      </header>

      <div className="sr-wrap">
        <h1 className="sr-h1">Search</h1>
        <p className="sr-meta">
          Find a dentist, practice or patient. Dentists are matched on the name that
          appears on their referrals, so historical referrers show up even if they've
          never signed in.
        </p>

        <form className="sr-form" action="/search" method="get">
          <input
            className="sr-input"
            type="search"
            name="q"
            defaultValue={raw}
            placeholder="Dentist, practice or patient name…"
            autoFocus
            autoComplete="off"
          />
          <button className="sr-go" type="submit">Search</button>
        </form>

        {configError && (
          <p className="sr-empty">
            Search is unavailable — <code>SUPABASE_SERVICE_ROLE_KEY</code> isn't set on
            this deployment.
          </p>
        )}

        {!configError && !hasQuery && (
          <p className="sr-empty">Type at least two characters to search.</p>
        )}

        {!configError && hasQuery && totalHits === 0 && (
          <p className="sr-empty">Nothing found for &ldquo;{raw}&rdquo;.</p>
        )}

        {dentists.length > 0 && (
          <section className="sr-sec">
            <h2 className="sr-sech">Dentists &middot; {dentists.length}</h2>
            <div className="sr-list">
              {dentists.map((d, i) => (
                <div className="sr-row" key={d.name + i}>
                  <div className="sr-name">
                    {d.name}
                    {d.hasLogin ? (
                      <span className="sr-pill login">Has login</span>
                    ) : (
                      <span className="sr-pill nologin">No login yet</span>
                    )}
                    {d.practices.length > 1 && (
                      <span className="sr-pill warn">
                        {d.practices.length} practices
                      </span>
                    )}
                  </div>
                  <div className="sr-sub">
                    {d.total.toLocaleString("en-GB")} referral
                    {d.total === 1 ? "" : "s"}
                    {d.lastAt ? ` · last ${fmtDate(d.lastAt)}` : ""}
                    {d.email ? ` · ${d.email}` : ""}
                  </div>
                  <div className="sr-prac">
                    {d.practices.map((p, j) =>
                      p.id ? (
                        <a
                          className="sr-pracrow"
                          key={p.id + "-" + j}
                          href={"/dashboard?practice=" + p.id}
                        >
                          <span className="sr-pracn">{p.name}</span>
                          <span className="sr-praccount">
                            {p.count.toLocaleString("en-GB")} referral
                            {p.count === 1 ? "" : "s"}
                          </span>
                        </a>
                      ) : (
                        <div className="sr-pracrow" key={"none-" + j}>
                          <span className="sr-pracn">{p.name}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {practices.length > 0 && (
          <section className="sr-sec">
            <h2 className="sr-sech">Practices &middot; {practices.length}</h2>
            <div className="sr-list">
              {practices.map((p) => (
                <a
                  className="sr-row"
                  key={p.id}
                  href={"/dashboard?practice=" + p.id}
                >
                  <div className="sr-name">{p.name}</div>
                  <div className="sr-sub">
                    {p.referrals.toLocaleString("en-GB")} referral
                    {p.referrals === 1 ? "" : "s"}
                    {p.where ? ` · ${p.where}` : ""}
                    {p.email ? ` · ${p.email}` : ""}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {patients.length > 0 && (
          <section className="sr-sec">
            <h2 className="sr-sech">Patients &middot; {patients.length}</h2>
            <div className="sr-list">
              {patients.map((p) => (
                <div className="sr-row" key={p.id}>
                  <div className="sr-name">{p.name}</div>
                  <div className="sr-sub">
                    {p.practice}
                    {p.dob ? ` · born ${fmtDate(p.dob)}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasQuery && totalHits >= LIMIT && (
          <p className="sr-hint">
            Showing the first {LIMIT} of each. Narrow the search to see more.
          </p>
        )}
      </div>
    </main>
  );
}
