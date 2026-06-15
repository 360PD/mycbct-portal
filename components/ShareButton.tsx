"use client";
import { useState } from "react";

export default function ShareButton({ referralId }: { referralId: string }) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleShare() {
    setBusy(true);
    setError("");
    setUrl("");
    setCopied(false);
    const res = await fetch(`/api/referrals/${referralId}/share`, {
      method: "POST",
    });
    if (res.ok) {
      const d = await res.json();
      setUrl(d.url);
    } else {
      const d = await res.json();
      setError(d.error || "Something went wrong.");
    }
    setBusy(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="sb-wrap">
      {!url ? (
        <button className="sb-btn" onClick={handleShare} disabled={busy}>
          {busy ? "Generating link…" : "⬡ Share scan"}
        </button>
      ) : (
        <div className="sb-result">
          <span className="sb-label">Shareable link — expires in 14 days</span>
          <div className="sb-row">
            <input className="sb-url" readOnly value={url} />
            <button className="sb-copy" onClick={handleCopy}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="sb-error">{error}</p>}

      <style>{`
        .sb-wrap{margin-bottom:24px;}
        .sb-btn{background:none;border:1px solid rgba(231,174,59,.4);color:#e7ae3b;
          font-size:14px;font-weight:600;padding:10px 24px;border-radius:999px;
          cursor:pointer;transition:background .15s;display:block;margin:0 auto;}
        .sb-btn:hover:not(:disabled){background:rgba(231,174,59,.1);}
        .sb-btn:disabled{opacity:.5;cursor:not-allowed;}
        .sb-result{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.1);
          border-radius:14px;padding:18px 20px;}
        .sb-label{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;
          color:rgba(247,244,236,.45);margin-bottom:10px;}
        .sb-row{display:flex;gap:10px;align-items:center;}
        .sb-url{flex:1;background:#0a1422;border:1px solid rgba(247,244,236,.15);
          border-radius:8px;color:#f7f4ec;font-size:13px;padding:10px 12px;
          min-width:0;font-family:monospace;}
        .sb-copy{flex:none;background:rgba(231,174,59,.15);border:1px solid rgba(231,174,59,.4);
          color:#e7ae3b;font-size:14px;font-weight:600;padding:10px 18px;
          border-radius:8px;cursor:pointer;white-space:nowrap;}
        .sb-copy:hover{background:rgba(231,174,59,.25);}
        .sb-error{color:#ff9b9b;font-size:14px;margin-top:10px;}
      `}</style>
    </div>
  );
}
