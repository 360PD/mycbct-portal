"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  "Lost due to move delay",
  "Already scanned elsewhere",
  "Patient declined",
  "Duplicate referral",
  "Other",
];

export default function ArchiveButton({ referralId }: { referralId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleArchive() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/referrals/${referralId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      router.refresh();
      setOpen(false);
    } else {
      const d = await res.json();
      setError(d.error || "Something went wrong.");
    }
    setBusy(false);
  }

  return (
    <>
      <button className="arc-trigger" onClick={() => setOpen(true)}>
        Archive referral
      </button>

      {open && (
        <div className="arc-backdrop" onClick={() => setOpen(false)}>
          <div className="arc-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="arc-title">Archive this referral?</h2>
            <p className="arc-sub">
              The referral will be removed from the active queue but kept on record.
            </p>

            <label className="arc-label">
              Reason
              <select
                className="arc-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            {error && <p className="arc-error">{error}</p>}

            <div className="arc-actions">
              <button className="arc-cancel" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="arc-confirm" onClick={handleArchive} disabled={busy}>
                {busy ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .arc-trigger{display:block;margin:0 auto 32px;background:none;
          border:1px solid rgba(255,120,120,.4);color:#ff9b9b;
          font-size:14px;font-weight:600;padding:10px 24px;border-radius:999px;
          cursor:pointer;transition:background .15s;}
        .arc-trigger:hover{background:rgba(255,120,120,.1);}
        .arc-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);
          display:flex;align-items:center;justify-content:center;z-index:999;padding:24px;}
        .arc-modal{background:#0e1b2e;border:1px solid rgba(247,244,236,.12);
          border-radius:20px;padding:32px;max-width:420px;width:100%;
          font-family:'DM Sans',system-ui,sans-serif;color:#f7f4ec;}
        .arc-title{font-family:'Fraunces',Georgia,serif;font-size:22px;
          font-weight:600;margin:0 0 10px;}
        .arc-sub{font-size:15px;color:rgba(247,244,236,.6);margin:0 0 24px;line-height:1.5;}
        .arc-label{display:flex;flex-direction:column;gap:8px;font-size:13px;
          letter-spacing:.08em;text-transform:uppercase;color:rgba(247,244,236,.5);
          margin-bottom:24px;}
        .arc-select{background:#0a1422;border:1px solid rgba(247,244,236,.15);
          border-radius:10px;color:#f7f4ec;font-size:15px;padding:12px 14px;
          appearance:none;cursor:pointer;}
        .arc-error{color:#ff9b9b;font-size:14px;margin:0 0 16px;}
        .arc-actions{display:flex;gap:12px;justify-content:flex-end;}
        .arc-cancel{background:none;border:1px solid rgba(247,244,236,.2);
          color:rgba(247,244,236,.7);font-size:14px;font-weight:600;
          padding:10px 20px;border-radius:999px;cursor:pointer;}
        .arc-cancel:hover{background:rgba(247,244,236,.06);}
        .arc-confirm{background:rgba(255,120,120,.15);border:1px solid rgba(255,120,120,.4);
          color:#ff9b9b;font-size:14px;font-weight:600;
          padding:10px 20px;border-radius:999px;cursor:pointer;}
        .arc-confirm:hover:not(:disabled){background:rgba(255,120,120,.25);}
        .arc-confirm:disabled{opacity:.5;cursor:not-allowed;}
      `}</style>
    </>
  );
}
