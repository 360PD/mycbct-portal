"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createReferral } from "@/app/refer/actions";

// v2 — staff practice picker + referring-dentist signature.
// Staff/admin choose the practice per referral and type the referring
// dentist's name. Dentists see the form exactly as before.

/**
 * Props (from app/refer/page.jsx):
 *   hasPractice  : boolean  — can this user create referrals?
 *   practiceName : string|null
 *   dentistName  : string   — default for the signature (dentists only)
 *   scanTypes    : [{ id, code, name, description, base_price }]
 *   reportFeePence : number — consultant report fee in pence (£120.00 = 12000)
 *   isStaff      : boolean  — staff/admin get the practice picker
 *   practices    : [{ id, name }] — staff only
 */

const SEX = [
  { v: "male", label: "Male" },
  { v: "female", label: "Female" },
  { v: "other", label: "Other" },
];

const PREGNANCY = [
  { v: "no", label: "No" },
  { v: "yes", label: "Yes" },
  { v: "unsure", label: "Unsure" },
  { v: "not_applicable", label: "N/A" },
];

const ARCH = [
  { v: "upper", label: "Upper jaw" },
  { v: "lower", label: "Lower jaw" },
];

const money = (pence) =>
  typeof pence === "number"
    ? new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(pence / 100)
    : "";

export default function ReferralForm({
  hasPractice,
  practiceName,
  dentistName = "",
  scanTypes = [],
  reportFeePence = 12000,
  isStaff = false,
  practices = [],
}) {
  const router = useRouter();

  // Staff sign with the REFERRING dentist's name, so start blank for them.
  const defaultSignature = isStaff ? "" : dentistName || "";

  const [f, setF] = useState({
    practiceId: "",
    firstName: "",
    lastName: "",
    dob: "",
    sex: "",
    pregnancy: "",
    scanTypeId: "",
    arch: "", // single-jaw only: "upper" | "lower"
    regionOfInterest: "",
    clinicalNotes: "",
    reportChoice: "", // "self" | "arrange"
    signatureName: defaultSignature,
    termsAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState("");
  const [done, setDone] = useState(null); // { patientName, ref }

  const set = (k, v) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: 0 } : prev));
  };

  const chosenScan = scanTypes.find((s) => s.id === f.scanTypeId) || null;
  const reportAvailable = !!chosenScan && chosenScan.code !== "ios";
  const reportRequested = f.reportChoice === "arrange";
  const scanFeePence = chosenScan?.base_price ?? null;
  const totalFeePence =
    typeof scanFeePence === "number"
      ? scanFeePence + (reportRequested ? reportFeePence : 0)
      : null;

  function validate() {
    const e = {};
    if (isStaff && !f.practiceId) e.practiceId = 1;
    if (!f.firstName.trim()) e.firstName = 1;
    if (!f.lastName.trim()) e.lastName = 1;
    if (!f.dob) e.dob = 1;
    if (!f.sex) e.sex = 1;
    if (!f.pregnancy) e.pregnancy = 1;
    if (!f.scanTypeId) e.scanTypeId = 1;
    if (chosenScan && chosenScan.code === "single_jaw" && !f.arch) e.arch = 1;
    if (!f.regionOfInterest.trim()) e.regionOfInterest = 1;
    if (!f.clinicalNotes.trim()) e.clinicalNotes = 1;
    if (!f.reportChoice) e.reportChoice = 1;
    if (!f.signatureName.trim()) e.signatureName = 1;
    if (!f.termsAccepted) e.termsAccepted = 1;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    setBanner("");
    if (!validate()) {
      setBanner("Please complete the highlighted fields.");
      return;
    }
    setSubmitting(true);

    // For a single-arch scan, record which jaw at the top of the notes.
    let notes = f.clinicalNotes.trim();
    if (chosenScan && chosenScan.code === "single_jaw" && f.arch) {
      const archLabel = f.arch === "upper" ? "Upper jaw" : "Lower jaw";
      notes = `Arch: ${archLabel}.` + (notes ? `\n\n${notes}` : "");
    }

    try {
      const res = await createReferral({
        firstName: f.firstName,
        lastName: f.lastName,
        dob: f.dob,
        sex: f.sex,
        pregnancy: f.pregnancy,
        scanTypeId: f.scanTypeId,
        regionOfInterest: f.regionOfInterest,
        clinicalNotes: notes,
        reportRequested: f.reportChoice === "arrange",
        signatureName: f.signatureName,
        practiceId: isStaff ? f.practiceId : undefined,
      });

      if (res.ok) {
        setDone({
          patientName: `${f.firstName.trim()} ${f.lastName.trim()}`,
          ref: res.referralId.slice(0, 8).toUpperCase(),
        });
        router.refresh();
      } else if (res.error === "NO_PRACTICE") {
        setBanner(
          "Your account isn't linked to a practice yet. Contact 360 Visualise to finish setup."
        );
      } else {
        setBanner(res.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setBanner("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setF({
      practiceId: "",
      firstName: "",
      lastName: "",
      dob: "",
      sex: "",
      pregnancy: "",
      scanTypeId: "",
      arch: "",
      regionOfInterest: "",
      clinicalNotes: "",
      reportChoice: "",
      signatureName: defaultSignature,
    });
    setErrors({});
    setBanner("");
    setDone(null);
  }

  return (
    <main className="rf-root">
      <style>{styles}</style>

      <header className="rf-bar">
        <div className="rf-brand">
          MyCBCT<span className="by">by 360 Visualise</span>
        </div>
        <a className="rf-back" href="/dashboard">
          &larr; Dashboard
        </a>
      </header>

      <div className="rf-wrap">
        {/* ---------- Not linked to a practice yet ---------- */}
        {!hasPractice ? (
          <div className="rf-card rf-notice">
            <span className="rf-tag">Account setup</span>
            <h1>Almost ready</h1>
            <p>
              Your login works, but it isn&rsquo;t linked to a practice yet, so
              referrals can&rsquo;t be created. Contact 360 Visualise to finish
              setup &mdash; then this form goes live for you.
            </p>
            <a className="rf-cta" href="/dashboard">
              Back to dashboard
            </a>
          </div>
        ) : done ? (
          /* ---------- Success ---------- */
          <div className="rf-card rf-success">
            <div className="rf-tick" aria-hidden="true">
              &#10003;
            </div>
            <h1>Referral submitted</h1>
            <p>
              <strong>{done.patientName}</strong> has been referred. Reference{" "}
              <strong>{done.ref}</strong>. It&rsquo;s now on your dashboard, and
              the 360 Visualise team can see it.
            </p>
            <div className="rf-success-actions">
              <button className="rf-cta" type="button" onClick={reset}>
                Refer another patient
              </button>
              <a className="rf-ghost" href="/dashboard">
                Back to dashboard
              </a>
            </div>
          </div>
        ) : (
          /* ---------- The form ---------- */
          <>
            <div className="rf-intro">
              <span className="rf-tag">New referral</span>
              <h1>Refer a patient</h1>
              {!isStaff && practiceName && (
                <p className="rf-practice">
                  Referring as <strong>{practiceName}</strong>
                </p>
              )}
            </div>

            {banner && <div className="rf-banner">{banner}</div>}

            {/* Practice (staff only) */}
            {isStaff && (
              <section className="rf-card">
                <h2>Practice</h2>
                <div className="rf-field">
                  <label>Which practice is this referral for? *</label>
                  <select
                    className={"rf-select " + (errors.practiceId ? "err" : "")}
                    value={f.practiceId}
                    onChange={(e) => set("practiceId", e.target.value)}
                  >
                    <option value="">Choose a practice&hellip;</option>
                    {practices.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </section>
            )}

            {/* Patient */}
            <section className="rf-card">
              <h2>Patient details</h2>
              <div className="rf-grid">
                <div className="rf-field">
                  <label>First name *</label>
                  <input
                    className={errors.firstName ? "err" : ""}
                    value={f.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="rf-field">
                  <label>Last name *</label>
                  <input
                    className={errors.lastName ? "err" : ""}
                    value={f.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    placeholder="Smith"
                  />
                </div>
                <div className="rf-field">
                  <label>Date of birth *</label>
                  <input
                    type="date"
                    className={errors.dob ? "err" : ""}
                    value={f.dob}
                    onChange={(e) => set("dob", e.target.value)}
                  />
                </div>
                <div className="rf-field">
                  <label>Sex *</label>
                  <div className={"rf-seg " + (errors.sex ? "err" : "")}>
                    {SEX.map((s) => (
                      <button
                        key={s.v}
                        type="button"
                        className={f.sex === s.v ? "on" : ""}
                        onClick={() => set("sex", s.v)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rf-field">
                <label>Is the patient pregnant or possibly pregnant? *</label>
                <p className="rf-help">
                  Required for radiation safety (IRMER). A simple flag is enough.
                </p>
                <div className={"rf-seg " + (errors.pregnancy ? "err" : "")}>
                  {PREGNANCY.map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      className={f.pregnancy === p.v ? "on" : ""}
                      onClick={() => set("pregnancy", p.v)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Scan */}
            <section className="rf-card">
              <h2>The scan</h2>

              <div className="rf-field">
                <label>Scan type *</label>
                <div className={"rf-choices " + (errors.scanTypeId ? "err" : "")}>
                  {scanTypes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={"rf-choice " + (f.scanTypeId === s.id ? "on" : "")}
                      onClick={() => {
                        set("scanTypeId", s.id);
                        if (s.code !== "single_jaw") set("arch", "");
                        if (s.code === "ios" && f.reportChoice === "arrange") {
                          set("reportChoice", "");
                        }
                      }}
                    >
                      <span className="t">{s.name}</span>
                      <span className="d">{s.description}</span>
                      <span className="p">{money(s.base_price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {chosenScan && chosenScan.code === "single_jaw" && (
                <div className="rf-field">
                  <label>Which arch? *</label>
                  <div className={"rf-seg " + (errors.arch ? "err" : "")}>
                    {ARCH.map((a) => (
                      <button
                        key={a.v}
                        type="button"
                        className={f.arch === a.v ? "on" : ""}
                        onClick={() => set("arch", a.v)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rf-field">
                <label>Region of interest *</label>
                <input
                  className={errors.regionOfInterest ? "err" : ""}
                  value={f.regionOfInterest}
                  onChange={(e) => set("regionOfInterest", e.target.value)}
                  placeholder="e.g. LR6, implant assessment"
                />
              </div>

              <div className="rf-field">
                <label>Clinical justification &amp; notes *</label>
                <p className="rf-help">
                  State the exact region and reason for the scan. Note any guides
                  or stents.
                </p>
                <textarea
                  className={errors.clinicalNotes ? "err" : ""}
                  rows={4}
                  value={f.clinicalNotes}
                  onChange={(e) => set("clinicalNotes", e.target.value)}
                  placeholder="e.g. Implant planning LR6. Surgical guide to follow."
                />
              </div>

              <div className="rf-field">
                <label>Radiology report *</label>
                <div className={"rf-choices two " + (errors.reportChoice ? "err" : "")}>
                  <button
                    type="button"
                    className={"rf-choice " + (f.reportChoice === "self" ? "on" : "")}
                    onClick={() => set("reportChoice", "self")}
                  >
                    <span className="t">{isStaff ? "Dentist will report this scan" : "I\u2019ll report this scan myself"}</span>
                    <span className="d">{isStaff ? "The referring dentist accepts responsibility to report this CBCT." : "You accept responsibility to report this CBCT."}</span>
                  </button>
                  <button
                    type="button"
                    disabled={!reportAvailable}
                    className={"rf-choice " + (f.reportChoice === "arrange" ? "on" : "")}
                    onClick={() => reportAvailable && set("reportChoice", "arrange")}
                  >
                    <span className="t">Arrange a consultant report</span>
                    <span className="d">
                      {reportAvailable
                        ? "Full report from a GDC-registered consultant radiologist."
                        : "Not available for this scan type."}
                    </span>
                  </button>
                </div>
              </div>

              {chosenScan && typeof scanFeePence === "number" && (
                <div className="rf-fees" aria-live="polite">
                  <p className="rf-fees-line">
                    <span>Scan fee</span>
                    <span>{money(scanFeePence)}</span>
                  </p>
                  {reportRequested && (
                    <p className="rf-fees-line">
                      <span>Radiologist report</span>
                      <span>{money(reportFeePence)}</span>
                    </p>
                  )}
                  <p className="rf-fees-total">
                    <span>Total</span>
                    <span>{money(totalFeePence)}</span>
                  </p>
                </div>
              )}
            </section>

            {/* Confirm */}
            <section className="rf-card">
              <h2>Confirm</h2>
              <div className="rf-field">
                <label>{isStaff ? "Referring dentist's name *" : "Your name (referral signature) *"}</label>
                {isStaff && (
                  <p className="rf-help">
                    The dentist who asked for this scan &mdash; their name goes on the referral.
                  </p>
                )}
                <input
                  className={errors.signatureName ? "err" : ""}
                  value={f.signatureName}
                  onChange={(e) => set("signatureName", e.target.value)}
                  placeholder="Dr A. Dentist"
                />
              </div>
              <div className={"rf-terms " + (errors.termsAccepted ? "err" : "")}>
                <label className="rf-terms-label">
                  <input
                    type="checkbox"
                    checked={f.termsAccepted}
                    onChange={(e) => set("termsAccepted", e.target.checked)}
                  />
                  <span>
                    I have read and agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                      Referral Terms &amp; Conditions
                    </a>
                  </span>
                </label>
              </div>
              <button
                className="rf-submit"
                type="button"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit referral"}
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600&display=swap');

.rf-root{min-height:100vh;background:#f7f4ec;color:#0e1b2e;
  font-family:"DM Sans",system-ui,sans-serif;}
.rf-bar{display:flex;align-items:center;justify-content:space-between;
  padding:18px clamp(20px,5vw,56px);border-bottom:1px solid rgba(14,27,46,.08);background:#0e1b2e;color:#f7f4ec;}
.rf-brand{font-family:"Fraunces",Georgia,serif;font-size:21px;font-weight:600;}
.rf-brand .by{display:block;font-family:"DM Sans",sans-serif;font-size:10.5px;
  letter-spacing:.16em;text-transform:uppercase;color:#e7ae3b;margin-top:2px;}
.rf-back{color:rgba(247,244,236,.8);text-decoration:none;font-size:14px;font-weight:500;}
.rf-back:hover{color:#e7ae3b;}

.rf-wrap{max-width:720px;margin:0 auto;padding:clamp(28px,5vw,52px) clamp(18px,5vw,40px);}
.rf-intro{margin:0 0 22px;}
.rf-tag{display:inline-block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;
  color:#b07d12;font-weight:600;margin-bottom:8px;}
.rf-intro h1{font-family:"Fraunces",Georgia,serif;font-size:clamp(28px,5vw,38px);margin:0;line-height:1.1;}
.rf-practice{color:rgba(14,27,46,.6);margin:8px 0 0;font-size:15px;}

.rf-banner{background:#fbe6e3;border:1px solid #e8b4ad;color:#9a2b1e;border-radius:12px;
  padding:13px 16px;font-size:14px;margin:0 0 18px;}

.rf-card{background:#fff;border:1px solid rgba(14,27,46,.09);border-radius:18px;
  padding:clamp(20px,4vw,30px);margin:0 0 18px;box-shadow:0 14px 40px -30px rgba(14,27,46,.35);}
.rf-card h2{font-family:"Fraunces",Georgia,serif;font-size:20px;margin:0 0 18px;}

.rf-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:6px;}
@media(max-width:560px){.rf-grid{grid-template-columns:1fr;}}
.rf-field{margin-bottom:18px;}
.rf-field:last-child{margin-bottom:0;}
.rf-field label{display:block;font-size:13.5px;font-weight:600;margin-bottom:6px;}
.rf-help{font-size:12.5px;color:rgba(14,27,46,.55);margin:0 0 8px;line-height:1.4;}

.rf-field input,.rf-field textarea{width:100%;border:1px solid rgba(14,27,46,.18);border-radius:11px;
  padding:12px 14px;font:inherit;font-size:15px;color:#0e1b2e;background:#fff;}
.rf-field input:focus,.rf-field textarea:focus{outline:none;border-color:#e7ae3b;
  box-shadow:0 0 0 3px rgba(231,174,59,.18);}
.rf-field textarea{resize:vertical;min-height:90px;}
.rf-field input.err,.rf-field textarea.err{border-color:#d9534f;background:#fdf3f2;}

.rf-select{width:100%;border:1px solid rgba(14,27,46,.18);border-radius:11px;
  padding:12px 14px;font:inherit;font-size:15px;color:#0e1b2e;background:#fff;cursor:pointer;}
.rf-select:focus{outline:none;border-color:#e7ae3b;box-shadow:0 0 0 3px rgba(231,174,59,.18);}
.rf-select.err{border-color:#d9534f;background:#fdf3f2;}

.rf-seg{display:inline-flex;flex-wrap:wrap;gap:8px;}
.rf-seg.err{outline:2px solid #f1c4bf;outline-offset:3px;border-radius:12px;}
.rf-seg button{appearance:none;border:1px solid rgba(14,27,46,.18);background:#fff;color:#0e1b2e;
  font:inherit;font-size:14px;font-weight:500;padding:9px 18px;border-radius:999px;cursor:pointer;}
.rf-seg button:hover{border-color:#0e1b2e;}
.rf-seg button.on{background:#0e1b2e;border-color:#0e1b2e;color:#fff;}

.rf-choices{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.rf-choices.two{grid-template-columns:1fr 1fr;}
@media(max-width:560px){.rf-choices,.rf-choices.two{grid-template-columns:1fr;}}
.rf-choices.err{outline:2px solid #f1c4bf;outline-offset:4px;border-radius:14px;}
.rf-choice{display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;
  border:1px solid rgba(14,27,46,.16);background:#fff;border-radius:13px;padding:14px 16px;cursor:pointer;
  font:inherit;transition:border-color .12s,box-shadow .12s;}
.rf-choice:hover:not(:disabled){border-color:#0e1b2e;}
.rf-choice.on{border-color:#e7ae3b;box-shadow:0 0 0 3px rgba(231,174,59,.18);background:#fffdf6;}
.rf-choice:disabled{opacity:.5;cursor:not-allowed;}
.rf-choice .t{font-weight:600;font-size:15px;}
.rf-choice .d{font-size:12.5px;color:rgba(14,27,46,.6);line-height:1.35;}
.rf-choice .p{margin-top:4px;font-weight:600;color:#b07d12;font-size:14px;}

.rf-fees{margin-top:16px;padding:12px 14px;border-radius:11px;
  background:rgba(231,174,59,.1);border:1px solid rgba(231,174,59,.28);}
.rf-fees-line,.rf-fees-total{display:flex;justify-content:space-between;gap:16px;
  margin:0;font-size:13px;line-height:1.5;color:#b07d12;}
.rf-fees-line + .rf-fees-line{margin-top:4px;}
.rf-fees-total{margin-top:8px;padding-top:8px;border-top:1px solid rgba(176,125,18,.25);
  font-weight:700;font-size:14px;color:#9a7120;}

.rf-terms{background:#0e1b2e;border-radius:11px;padding:14px 16px;margin:0 0 16px;
  border:1px solid rgba(14,27,46,.2);}
.rf-terms.err{outline:2px solid #f1c4bf;outline-offset:3px;}
.rf-terms-label{display:flex;align-items:flex-start;gap:12px;color:#f7f4ec;
  font-size:14px;line-height:1.55;cursor:pointer;}
.rf-terms-label input{appearance:none;width:18px;height:18px;margin-top:2px;flex:none;cursor:pointer;
  border:1px solid rgba(231,174,59,.55);border-radius:4px;background:rgba(247,244,236,.08);
  position:relative;}
.rf-terms-label input:checked{background:#e7ae3b;border-color:#e7ae3b;}
.rf-terms-label input:checked::after{content:"";position:absolute;left:5px;top:2px;width:5px;height:9px;
  border:solid #0e1b2e;border-width:0 2px 2px 0;transform:rotate(45deg);}
.rf-terms-label a{color:#e7ae3b;font-weight:600;text-decoration:none;}
.rf-terms-label a:hover{text-decoration:underline;}

.rf-submit{width:100%;margin-top:6px;appearance:none;border:none;background:#e7ae3b;color:#0e1b2e;
  font:inherit;font-weight:600;font-size:16px;padding:15px;border-radius:999px;cursor:pointer;}
.rf-submit:hover:not(:disabled){filter:brightness(1.05);}
.rf-submit:disabled{opacity:.7;cursor:default;}

.rf-cta{display:inline-block;background:#0e1b2e;color:#f7f4ec;font-weight:600;font-size:15px;
  text-decoration:none;border:none;cursor:pointer;font-family:inherit;padding:13px 26px;border-radius:999px;}
.rf-cta:hover{filter:brightness(1.15);}
.rf-ghost{display:inline-block;color:#0e1b2e;font-weight:600;font-size:15px;text-decoration:none;padding:13px 22px;}
.rf-ghost:hover{color:#b07d12;}

.rf-notice,.rf-success{text-align:center;}
.rf-notice h1,.rf-success h1{font-family:"Fraunces",Georgia,serif;font-size:clamp(24px,5vw,32px);margin:10px 0 12px;}
.rf-notice p,.rf-success p{color:rgba(14,27,46,.7);font-size:16px;line-height:1.55;margin:0 0 24px;}
.rf-success-actions{display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;}
.rf-tick{width:60px;height:60px;border-radius:50%;background:rgba(54,184,134,.15);color:#36b886;
  display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto;}
`;
