"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createReferral } from "@/app/refer/actions";

/**
 * MyCBCT — Referral form (Phase 2).
 * Wired to the createReferral server action: creates a patient + referral,
 * stamped with the signed-in dentist, scoped to their practice by RLS.
 *
 * Props (from app/refer/page.tsx):
 *   hasPractice  : boolean  — is the dentist linked to a practice yet?
 *   practiceName : string|null
 *   dentistName  : string   — default for the signature
 *   scanTypes    : [{ id, code, name, description, base_price }]
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
}) {
  const router = useRouter();

  const [f, setF] = useState({
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
    signatureName: dentistName || "",
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

  function validate() {
    const e = {};
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
      signatureName: dentistName || "",
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
              {practiceName && (
                <p className="rf-practice">
                  Referring as <strong>{practiceName}</strong>
                </p>
              )}
            </div>

            {banner && <div className="rf-banner">{banner}</div>}

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
                  placeholder="e
