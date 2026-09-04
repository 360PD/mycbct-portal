"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addReferralNote, setChaseState } from "@/lib/actions/referral-notes";

// ReferralNotes v2 — chase state plus the notes thread.
// Staff only. The three state chips are one click each and record themselves
// in the thread, so "waiting on the patient since 4 Sept" is a fact the
// dashboard can read rather than prose somebody has to interpret.

const STATES = [
  { key: "waiting_patient", label: "Waiting on patient" },
  { key: "waiting_dentist", label: "Waiting on dentist" },
  { key: "ready_to_book", label: "Ready to book" },
];

function fmtWhen(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReferralNotes({ referralId, notes, chaseState }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState(chaseState || null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const list = notes || [];

  function pickState(key) {
    const next = state === key ? null : key; // clicking the active chip clears it
    const previous = state;
    setState(next); // move now, put it back if the save fails
    setError("");

    startTransition(async () => {
      const res = await setChaseState(referralId, next);
      if (res && res.ok) {
        router.refresh();
      } else {
        setState(previous);
        setError((res && res.error) || "That didn't save. Try again.");
      }
    });
  }

  function submit(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) {
      setError("Type a note first.");
      return;
    }
    setError("");

    startTransition(async () => {
      const res = await addReferralNote(referralId, text);
      if (res && res.ok) {
        setBody("");
        router.refresh();
      } else {
        setError((res && res.error) || "That note didn't save. Try again.");
      }
    });
  }

  return (
    <section className="rn-card">
      <h2 className="rn-h2">
        Notes
        <span className="rn-count">
          {list.length === 0
            ? "team only — the dentist never sees these"
            : list.length === 1
              ? "1 note · team only"
              : list.length + " notes · team only"}
        </span>
      </h2>

      <div className="rn-states">
        <span className="rn-states-label">Where is it stuck?</span>
        <div className="rn-chips">
          {STATES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={"rn-chip" + (state === s.key ? " on" : "")}
              onClick={() => pickState(s.key)}
              disabled={pending}
              aria-pressed={state === s.key}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="rn-states-hint">
          {state
            ? "Click it again to clear. Every change is logged below."
            : "Nothing set — this referral won't show a chase state on the dashboard."}
        </p>
      </div>

      {list.length > 0 && (
        <ul className="rn-list">
          {list.map((n) => (
            <li className="rn-item" key={n.id}>
              <div className="rn-meta">
                <span className="rn-who">{n.authorName || "360 Visualise"}</span>
                <span className="rn-when">{fmtWhen(n.created_at)}</span>
              </div>
              <p className="rn-body">{n.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="rn-form" onSubmit={submit}>
        <textarea
          className="rn-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note — what was agreed, what needs chasing, why this changed&hellip;"
          rows={3}
          maxLength={4000}
          disabled={pending}
        />
        <div className="rn-row">
          {error ? <span className="rn-error">{error}</span> : <span />}
          <button className="rn-btn" type="submit" disabled={pending || !body.trim()}>
            {pending ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>

      <style>{`
        .rn-card{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:24px 26px;margin-bottom:22px;}
        .rn-h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;
          margin:0 0 18px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}
        .rn-count{font-family:'DM Sans',system-ui,sans-serif;font-size:12.5px;font-weight:400;
          color:rgba(247,244,236,.45);}
        .rn-states{padding:0 0 18px;margin:0 0 4px;
          border-bottom:1px solid rgba(247,244,236,.08);}
        .rn-states-label{display:block;font-size:12px;letter-spacing:.1em;
          text-transform:uppercase;color:rgba(247,244,236,.45);margin-bottom:10px;}
        .rn-chips{display:flex;gap:8px;flex-wrap:wrap;}
        .rn-chip{appearance:none;font:inherit;font-size:14px;font-weight:600;cursor:pointer;
          background:transparent;color:rgba(247,244,236,.75);
          border:1px solid rgba(247,244,236,.22);border-radius:999px;padding:8px 16px;}
        .rn-chip:hover:not(:disabled){border-color:#e7ae3b;color:#e7ae3b;}
        .rn-chip.on{background:#e7ae3b;border-color:#e7ae3b;color:#0e1b2e;}
        .rn-chip:disabled{opacity:.5;cursor:default;}
        .rn-states-hint{margin:10px 0 0;font-size:12.5px;color:rgba(247,244,236,.4);}
        .rn-list{list-style:none;margin:18px 0 20px;padding:0;}
        .rn-item{padding:14px 0;border-bottom:1px solid rgba(247,244,236,.08);}
        .rn-item:last-child{border-bottom:none;padding-bottom:0;}
        .rn-meta{display:flex;align-items:baseline;gap:10px;margin-bottom:5px;flex-wrap:wrap;}
        .rn-who{font-size:13.5px;font-weight:600;color:#e7ae3b;}
        .rn-when{font-size:12.5px;color:rgba(247,244,236,.45);}
        .rn-body{margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;
          color:rgba(247,244,236,.9);}
        .rn-form{display:flex;flex-direction:column;gap:10px;}
        .rn-input{width:100%;box-sizing:border-box;background:#13233c;
          border:1px solid rgba(247,244,236,.18);border-radius:12px;padding:12px 14px;
          color:#f7f4ec;font:inherit;font-size:15px;line-height:1.55;resize:vertical;}
        .rn-input::placeholder{color:rgba(247,244,236,.38);}
        .rn-input:focus{outline:none;border-color:#e7ae3b;}
        .rn-input:disabled{opacity:.6;}
        .rn-row{display:flex;align-items:center;justify-content:space-between;gap:12px;}
        .rn-error{font-size:13.5px;color:#ff9b9b;}
        .rn-btn{appearance:none;border:none;background:#e7ae3b;color:#0e1b2e;font:inherit;
          font-weight:600;font-size:14.5px;padding:10px 22px;border-radius:999px;cursor:pointer;}
        .rn-btn:hover:not(:disabled){filter:brightness(1.05);}
        .rn-btn:disabled{opacity:.45;cursor:default;}
      `}</style>
    </section>
  );
}
