"use client";

// DNA (Did Not Attend) — placeholder until email notification is wired up.
export default function DiaryDnaButton({ appointmentId }) {
  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Mark appointment as DNA and send notification email.
    void appointmentId;
  }

  return (
    <button type="button" className="dv-dna" onClick={handleClick}>
      DNA
    </button>
  );
}
