import { createClient } from "@/lib/supabase/server";
import { presignView } from "@/lib/backblaze";

function one(v: unknown) {
  if (Array.isArray(v)) return v[0] || null;
  return v || null;
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isImageFile(name: string | null) {
  return /\.(jpe?g|png)$/i.test(name || "");
}

function fmtBytes(n: number | null) {
  const b = Number(n || 0);
  if (!b) return "";
  if (b >= 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  if (b >= 1024 * 1024) return Math.round(b / (1024 * 1024)) + " MB";
  if (b >= 1024) return Math.round(b / 1024) + " KB";
  return b + " B";
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: shareToken } = await supabase
    .from("share_tokens")
    .select("referral_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!shareToken) {
    return (
      <main className="sp">
        <div className="sp-inner sp-error">
          <h1 className="sp-title">Link not found or expired</h1>
          <p className="sp-sub">This sharing link is invalid or has expired. Please ask the sender for a new one.</p>
        </div>
        <style>{pageStyle}</style>
      </main>
    );
  }

  const { data: ref } = await supabase
    .from("referrals")
    .select(
      "id, created_at, report_requested, " +
      "patients(first_name, last_name, date_of_birth, sex), " +
      "scan_types(name)"
    )
    .eq("id", shareToken.referral_id)
    .maybeSingle();

  if (!ref) {
    return (
      <main className="sp">
        <div className="sp-inner sp-error">
          <h1 className="sp-title">Referral not found</h1>
          <p className="sp-sub">This referral no longer exists.</p>
        </div>
        <style>{pageStyle}</style>
      </main>
    );
  }

  const patient = one(ref.patients) as { first_name: string; last_name: string; date_of_birth: string; sex: string } | null;
  const scanType = one(ref.scan_types) as { name: string } | null;
  const patientName = patient
    ? [patient.first_name, patient.last_name].filter(Boolean).join(" ")
    : "Patient";

  const isCbct = !!scanType && /cbct/i.test(scanType.name || "");

  const { data: scans } = await supabase
    .from("scans")
    .select("id, original_filename, file_size_bytes, uploaded_at, storage_key")
    .eq("referral_id", ref.id)
    .order("uploaded_at", { ascending: false });

  const scanList = scans || [];

  const imageUrls: Record<string, string> = {};
  if (!isCbct) {
    await Promise.all(
      scanList.map(async (s) => {
        if (s.storage_key && isImageFile(s.original_filename)) {
          try {
            imageUrls[s.id] = await presignView(s.storage_key);
          } catch { /* leave unset */ }
        }
      })
    );
  }

  const expiresDate = fmtDate(shareToken.expires_at);

  return (
    <main className="sp">
      <div className="sp-inner">
        <div className="sp-brand">
          <span className="sp-brand-name">MyCBCT</span>
          <span className="sp-brand-tag">Shared scan</span>
        </div>

        <header className="sp-head">
          <h1 className="sp-name">{patientName}</h1>
        </header>

        <section className="sp-card">
          <dl className="sp-grid">
            <div>
              <dt>Scan type</dt>
              <dd>{scanType ? scanType.name : "\u2014"}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{patient?.date_of_birth ? fmtDate(patient.date_of_birth) : "\u2014"}</dd>
            </div>
            <div>
              <dt>Sex</dt>
              <dd>{patient?.sex || "\u2014"}</dd>
            </div>
            <div>
              <dt>Referred</dt>
              <dd>{fmtDate(ref.created_at)}</dd>
            </div>
            <div>
              <dt>Report requested</dt>
              <dd>{ref.report_requested ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </section>

        <section className="sp-card">
          <h2 className="sp-h2">Scans</h2>
          {scanList.length === 0 ? (
            <p className="sp-empty">No scans available yet.</p>
          ) : (
            <ul className="sp-scans">
              {scanList.map((s) => (
                <li className="sp-scan" key={s.id}>
                  <div className="sp-scan-row">
                    <span className="sp-scan-main">
                      <span className="sp-scan-file">{s.original_filename || "scan"}</span>
                      <span className="sp-scan-meta">
                        {fmtBytes(s.file_size_bytes)}
                        {s.file_size_bytes && s.uploaded_at ? " · " : ""}
                        {fmtDate(s.uploaded_at)}
                      </span>
                    </span>
                    <a className="sp-dl" href={`/api/scans/${s.id}/download`}>
                      Download
                    </a>
                  </div>
                  {!isCbct && imageUrls[s.id] ? (
                    <a href={imageUrls[s.id]} target="_blank" rel="noopener noreferrer">
                      <img className="sp-opg" src={imageUrls[s.id]} alt={"Scan for " + patientName} loading="lazy" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="sp-expires">This link expires {expiresDate}. Shared via MyCBCT — mycbct.co.uk</p>
      </div>
      <style>{pageStyle}</style>
    </main>
  );
}

const pageStyle = `
  .sp{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
    font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
    padding:40px 24px 80px;}
  .sp-inner{max-width:680px;margin:0 auto;}
  .sp-error{padding-top:80px;}
  .sp-brand{display:flex;align-items:center;gap:12px;margin-bottom:32px;}
  .sp-brand-name{font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:700;color:#e7ae3b;}
  .sp-brand-tag{font-size:12px;letter-spacing:.1em;text-transform:uppercase;
    color:rgba(247,244,236,.45);border:1px solid rgba(247,244,236,.15);
    border-radius:999px;padding:4px 12px;}
  .sp-head{margin-bottom:24px;}
  .sp-name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:30px;margin:0;}
  .sp-title{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:26px;margin:0 0 12px;}
  .sp-sub{color:rgba(247,244,236,.6);font-size:15px;line-height:1.55;}
  .sp-card{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
    border-radius:16px;padding:24px 26px;margin-bottom:22px;}
  .sp-h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;margin:0 0 18px;}
  .sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 28px;margin:0;}
  .sp-grid dt{font-size:12px;letter-spacing:.1em;text-transform:uppercase;
    color:rgba(247,244,236,.45);margin-bottom:4px;}
  .sp-grid dd{margin:0;font-size:15px;}
  .sp-empty{color:rgba(247,244,236,.5);font-size:15px;margin:0;}
  .sp-scans{list-style:none;margin:0;padding:0;}
  .sp-scan{padding:14px 0;border-bottom:1px solid rgba(247,244,236,.08);}
  .sp-scan:last-child{border-bottom:none;}
  .sp-scan-row{display:flex;align-items:center;justify-content:space-between;gap:16px;}
  .sp-scan-main{display:flex;flex-direction:column;gap:3px;min-width:0;}
  .sp-scan-file{font-size:15px;word-break:break-word;}
  .sp-scan-meta{font-size:13px;color:rgba(247,244,236,.5);}
  .sp-dl{flex:none;text-decoration:none;font-size:14px;font-weight:600;
    color:#e7ae3b;border:1px solid rgba(231,174,59,.4);border-radius:8px;
    padding:8px 16px;}
  .sp-dl:hover{background:rgba(231,174,59,.12);}
  .sp-opg{display:block;width:100%;height:auto;max-height:62vh;object-fit:contain;
    background:#0a1422;border:1px solid rgba(247,244,236,.1);border-radius:12px;margin-top:14px;}
  .sp-expires{font-size:13px;color:rgba(247,244,236,.35);text-align:center;margin-top:32px;}
  @media(max-width:560px){.sp-grid{grid-template-columns:1fr;}}
`;
