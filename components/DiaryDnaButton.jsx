"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DiaryDnaButton({ appointmentId, isDna = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isDna || busy) return;

    if (!window.confirm("Mark this appointment as DNA and notify the referring dentist?")) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const res = await fetch(`/api/appointments/${appointmentId}/dna`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not mark as DNA");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as DNA");
    } finally {
      setBusy(false);
    }
  }

  if (isDna) {
    return (
      <span className="dv-dna-badge" title="Did not attend">
        DNA
      </span>
    );
  }

  return (
    <div className="dv-dna-wrap">
      <button
        type="button"
        className="dv-dna"
        onClick={handleClick}
        disabled={busy}
        title="Mark as did not attend"
      >
        {busy ? "…" : "DNA"}
      </button>
      {error ? <span className="dv-dna-err">{error}</span> : null}
    </div>
  );
}
