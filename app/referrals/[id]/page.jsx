import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { presignView } from "@/lib/backblaze";
import ScanUploader from "@/components/ScanUploader";
import ScanViewer from "@/components/ScanViewer";

// v2.2 — shows the booked appointment date + booking links.
// Staff see Manage booking / Book appointment; dentists see the date
// (read-only, via the practice-scoped RLS policy added 10 June).

const STATUS_LABEL = {
  submitted: "Submitted",
  booked: "Booked",
  scanned: "Scanned",
  delivered: "Delivered",
  invoiced: "Invoiced",
  cancelled: "Cancelled",
};

const PREVIEW_LABEL = {
  none: "",
  pending: "Preview queued",
  processing: "Building preview",
  ready: "Preview ready",
  failed: "Preview failed",
};

// Supabase returns a to-one embed as an object, but can hand back an array.
function one(v) {
  if (Array.isArray(v)) return v[0] || null;
  return v || null;
}

function isImageFile(name) {
  return /\.(jpe?g|png)$/i.test(name || "");
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtApptTime(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBytes(n) {
  const b = Number(n || 0);
  if (!b) return "";
  if (b >= 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  if (b >= 1024 * 1024) return Math.round(b / (1024 * 1024)) + " MB";
  if (b >= 1024) return Math.round(b / 1024) + " KB";
  return b + " B";
}

export default async function ReferralDetailPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/sign-in?next=/referrals/" + id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.claims.sub)
    .maybeSingle();
  const role = profile?.role || "dentist";
  const canUpload = role === "staff" || role === "admin";

  const { data: ref } = await supabase
    .from("referrals")
    .select(
      "id, status, created_at, pregnancy, clinical_notes, region_of_interest, report_requested, signature_name, " +
        "patients(first_name,last_name,date_of_birth,sex), scan_types(name,code)"
    )
    .eq("id", id)
    .maybeSingle();

  // No row = not found, or no access under RLS. Send them back.
  if (!ref) redirect("/dashboard");

  const patient = one(ref.patients);
  const scanType = one(ref.scan_types);
  const patientName = patient
    ? [patient.first_name, patient.last_name].filter(Boolean).join(" ")
    : "Patient";

  // Live appointment, if any. Dentists can read these for their own
  // practice's referrals; staff can read all.
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, starts_at, status")
    .eq("referral_id", id)
    .eq("status", "booked")
    .maybeSingle();

  // Only CBCT scans have a slice preview. OPG scans are JPEGs (their own image)
  // and show inline instead of going through the slice viewer.
  const isCbct =
    !!scanType &&
    /cbct/i.test((scanType.code || "") + " " + (scanType.name || ""));

  const { data: scans } = await supabase
    .from("scans")
    .select("id, original_filename, file_size_bytes, preview_status, uploaded_at, storage_key")
    .eq("referral_id", id)
    .order("uploaded_at", { ascending: false });

  const scanList = scans || [];

  // For OPG (non-CBCT) image scans, sign an inline URL so the page can show the
  // image directly. CBCT scans are handled by the slice viewer, not here.
  const imageUrls = {};
  if (!isCbct) {
    await Promise.all(
      scanList.map(async (s) => {
        if (s.storage_key && isImageFile(s.original_filename)) {
          try {
            imageUrls[s.id] = await presignView(s.storage_key);
          } catch {
            /* leave unset — falls back to the Download button */
          }
        }
      })
    );
  }

  const bookHref = "/referrals/" + id + "/book";

  return (
    <main className="rd">
      <div className="rd-inner">
        <a className="rd-back" href="/dashboard">&larr; Back to dashboard</a>

        <header className="rd-head">
          <h1 className="rd-name">{patientName}</h1>
          <span className={"rd-badge " + ref.status}>
            {STATUS_LABEL[ref.status] || ref.status}
          </span>
        </header>

        {/* ---------- Appointment strip ---------- */}
        {appt ? (
          <div className="rd-appt">
            <span className="rd-appt-icon" aria-hidden="true">&#128197;</span>
            <span className="rd-appt-text">
              Scan appointment: <b>{fmtApptTime(appt.starts_at)}</b>
            </span>
            {canUpload ? (
              <a className="rd-appt-link" href={bookHref}>Manage booking</a>
            ) : null}
          </div>
        ) : canUpload && (ref.status === "submitted" || ref.status === "booked") ? (
          <div className="rd-appt none">
            <span className="rd-appt-text">No appointment booked yet.</span>
            <a className="rd-appt-link" href={bookHref}>Book appointment</a>
          </div>
        ) : null}

        <section className="rd-card">
          <h2 className="rd-h2">Referral</h2>
          <dl className="rd-grid">
            <div>
              <dt>Scan type</dt>
              <dd>{scanType ? scanType.name : "\u2014"}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{patient && patient.date_of_birth ? fmtDate(patient.date_of_birth) : "\u2014"}</dd>
            </div>
            <div>
              <dt>Sex</dt>
              <dd>{patient && patient.sex ? patient.sex : "\u2014"}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{fmtDate(ref.created_at)}</dd>
            </div>
            <div>
              <dt>Region of interest</dt>
              <dd>{ref.region_of_interest || "\u2014"}</dd>
            </div>
            <div>
              <dt>Pregnancy</dt>
              <dd>{ref.pregnancy ? ref.pregnancy.replace(/_/g, " ") : "\u2014"}</dd>
            </div>
            <div>
              <dt>Report requested</dt>
              <dd>{ref.report_requested ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Referred by</dt>
              <dd>{ref.signature_name || "\u2014"}</dd>
            </div>
          </dl>

          {ref.clinical_notes ? (
            <div className="rd-notes">
              <dt>Clinical notes</dt>
              <dd>{ref.clinical_notes}</dd>
            </div>
          ) : null}
        </section>

        <section className="rd-card">
          <h2 className="rd-h2">Scans</h2>

          {scanList.length === 0 ? (
            <p className="rd-empty">
              {canUpload
                ? "No scans uploaded yet."
                : "Your scan isn't ready yet. It will appear here as soon as we've completed it."}
            </p>
          ) : (
            <ul className="rd-scans">
              {scanList.map((s) => (
                <li className="rd-scan" key={s.id}>
                  <div className="rd-scan-row">
                    <span className="rd-scan-main">
                      <span className="rd-scan-file">
                        {s.original_filename || "scan"}
                      </span>
                      <span className="rd-scan-meta">
                        {fmtBytes(s.file_size_bytes)}
                        {s.file_size_bytes && s.uploaded_at ? " \u00b7 " : ""}
                        {fmtDate(s.uploaded_at)}
                        {PREVIEW_LABEL[s.preview_status]
                          ? " \u00b7 " + PREVIEW_LABEL[s.preview_status]
                          : ""}
                      </span>
                    </span>
                    <a className="rd-dl" href={"/api/scans/" + s.id + "/download"}>
                      Download
                    </a>
                  </div>

                  {isCbct ? <ScanViewer scanId={s.id} /> : null}

                  {!isCbct && imageUrls[s.id] ? (
                    <a className="rd-opg-link" href={imageUrls[s.id]} target="_blank" rel="noopener noreferrer">
                      <img className="rd-opg" src={imageUrls[s.id]} alt={"OPG image for " + patientName} loading="lazy" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canUpload ? <ScanUploader referralId={id} /> : null}
        </section>
      </div>

      <style>{`
        .rd{min-height:100vh;background:#0e1b2e;color:#f7f4ec;
          font-family:'DM Sans',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
          padding:40px 24px 80px;}
        .rd-inner{max-width:760px;margin:0 auto;}
        .rd-back{display:inline-block;color:rgba(247,244,236,.6);text-decoration:none;
          font-size:14px;margin-bottom:24px;}
        .rd-back:hover{color:#e7ae3b;}
        .rd-head{display:flex;align-items:center;gap:16px;margin-bottom:18px;flex-wrap:wrap;}
        .rd-name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:30px;margin:0;}
        .rd-badge{font-size:12px;letter-spacing:.08em;text-transform:uppercase;
          font-weight:600;padding:5px 12px;border-radius:999px;
          background:rgba(247,244,236,.12);color:rgba(247,244,236,.85);}
        .rd-badge.scanned,.rd-badge.delivered{background:rgba(231,174,59,.18);color:#e7ae3b;}
        .rd-badge.cancelled{background:rgba(255,120,120,.16);color:#ff9b9b;}
        .rd-appt{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          background:rgba(231,174,59,.12);border:1px solid rgba(231,174,59,.4);
          border-radius:13px;padding:14px 18px;margin:0 0 22px;font-size:15px;}
        .rd-appt.none{background:rgba(247,244,236,.05);border-color:rgba(247,244,236,.15);}
        .rd-appt-icon{font-size:17px;}
        .rd-appt-text b{color:#e7ae3b;}
        .rd-appt-link{margin-left:auto;color:#e7ae3b;font-weight:600;font-size:14px;
          text-decoration:none;border:1px solid rgba(231,174,59,.5);border-radius:999px;
          padding:8px 16px;white-space:nowrap;}
        .rd-appt-link:hover{background:rgba(231,174,59,.12);}
        .rd-card{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:24px 26px;margin-bottom:22px;}
        .rd-h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;
          margin:0 0 18px;}
        .rd-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 28px;margin:0;}
        .rd-grid dt,.rd-notes dt{font-size:12px;letter-spacing:.1em;text-transform:uppercase;
          color:rgba(247,244,236,.45);margin-bottom:4px;}
        .rd-grid dd,.rd-notes dd{margin:0;font-size:15px;}
        .rd-notes{margin-top:20px;}
        .rd-notes dd{line-height:1.55;white-space:pre-wrap;}
        .rd-empty{color:rgba(247,244,236,.5);font-size:15px;margin:0 0 18px;}
        .rd-scans{list-style:none;margin:0 0 18px;padding:0;}
        .rd-scan{display:flex;flex-direction:column;gap:14px;
          padding:14px 0;border-bottom:1px solid rgba(247,244,236,.08);}
        .rd-scan:last-child{border-bottom:none;}
        .rd-scan-row{display:flex;align-items:center;justify-content:space-between;gap:16px;}
        .rd-scan-main{display:flex;flex-direction:column;gap:3px;min-width:0;}
        .rd-scan-file{font-size:15px;word-break:break-word;}
        .rd-scan-meta{font-size:13px;color:rgba(247,244,236,.5);}
        .rd-dl{flex:none;text-decoration:none;font-size:14px;font-weight:600;
          color:#e7ae3b;border:1px solid rgba(231,174,59,.4);border-radius:8px;
          padding:8px 16px;transition:background .15s ease;}
        .rd-dl:hover{background:rgba(231,174,59,.12);}
        .rd-opg-link{display:block;margin-top:4px;}
        .rd-opg{display:block;width:100%;height:auto;max-height:62vh;object-fit:contain;
          background:#0a1422;border:1px solid rgba(247,244,236,.1);border-radius:12px;}
        @media(max-width:560px){.rd-grid{grid-template-columns:1fr;}}
      `}</style>
    </main>
  );
}
