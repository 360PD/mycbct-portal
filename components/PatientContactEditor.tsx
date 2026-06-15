"use client";
import { useState } from "react";

export default function PatientContactEditor({ patientId, phone, altPhone, email }: {
  patientId: string;
  phone: string;
  altPhone: string;
  email: string;
}) {
  const [p, setP] = useState(phone);
  const [ap, setAp] = useState(altPhone);
  const [e, setE] = useState(email);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await fetch(`/api/patients/${patientId}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p, alt_phone: ap, email: e }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error || "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <section className="pce-card">
      <h2 className="pce-h2">Patient contact</h2>
      <div className="pce-fields">
        <label className="pce-label">
          Phone
          <input className="pce-input" value={p} onChange={e => setP(e.target.value)} placeholder="e.g. 07700 900000" />
        </label>
        <label className="pce-label">
          Alt phone
          <input className="pce-input" value={ap} onChange={e => setAp(e.target.value)} placeholder="e.g. 01234 567890" />
        </label>
        <label className="pce-label">
          Email
          <input className="pce-input" value={e} onChange={ev => setE(ev.target.value)} placeholder="e.g. patient@email.com" />
        </label>
      </div>
      {error && <p className="pce-error">{error}</p>}
      <button className="pce-save" onClick={handleSave} disabled={busy}>
        {busy ? "Saving…" : saved ? "Saved ✓" : "Save contact details"}
      </button>

      <style>{`
        .pce-card{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:24px 26px;margin-bottom:22px;}
        .pce-h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;margin:0 0 18px;}
        .pce-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px 28px;margin-bottom:18px;}
        .pce-label{display:flex;flex-direction:column;gap:8px;font-size:12px;
          letter-spacing:.1em;text-transform:uppercase;color:rgba(247,244,236,.45);}
        .pce-input{background:#0a1422;border:1px solid rgba(247,244,236,.15);
          border-radius:10px;color:#f7f4ec;font-size:15px;padding:10px 12px;}
        .pce-input:focus{outline:none;border-color:rgba(231,174,59,.5);}
        .pce-error{color:#ff9b9b;font-size:14px;margin:0 0 12px;}
        .pce-save{background:rgba(231,174,59,.15);border:1px solid rgba(231,174,59,.4);
          color:#e7ae3b;font-size:14px;font-weight:600;padding:10px 24px;
          border-radius:999px;cursor:pointer;}
        .pce-save:hover:not(:disabled){background:rgba(231,174,59,.25);}
        .pce-save:disabled{opacity:.5;cursor:not-allowed;}
        @media(max-width:560px){.pce-fields{grid-template-columns:1fr;}}
      `}</style>
    </section>
  );
}
