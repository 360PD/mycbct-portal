"use client";

// The two buttons a patient presses, with feedback.
//
// The booking page is a server component, so pressing a time button is a round
// trip to the server. That takes a second or two, and until this existed the
// button did nothing visible in the meantime — no colour change, no movement.
// A patient reasonably concludes it didn't work and presses again.
//
// useFormStatus tells us the form is in flight, so the button we pressed says
// "Booking…" and every other button goes flat and unclickable. That also stops
// somebody booking two slots by tapping twice.
//
// All the times live in ONE form so they all know when one of them is working.

import { useState } from "react";
import { useFormStatus } from "react-dom";

function SlotGrid({ days, picked, onPick }) {
  const { pending } = useFormStatus();

  return (
    <>
      {days.map((d) => (
        <div className="pb-day" key={d.day}>
          <h3 className="pb-day-name">{d.label}</h3>
          <div className="pb-slots">
            {d.slots.map((s) => {
              const busy = pending && picked === s.iso;
              return (
                <button
                  key={s.iso}
                  className={"pb-slot" + (busy ? " is-busy" : "")}
                  type="submit"
                  name="slot"
                  value={s.iso}
                  disabled={pending}
                  aria-busy={busy ? "true" : undefined}
                  onClick={() => onPick(s.iso)}
                >
                  {busy ? "Booking…" : s.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function PatientSlots({ action, days }) {
  const [picked, setPicked] = useState("");
  return (
    <form action={action}>
      <SlotGrid days={days} picked={picked} onPick={setPicked} />
    </form>
  );
}

function PayInner() {
  const { pending } = useFormStatus();
  return (
    <button
      className={"pb-pay" + (pending ? " is-busy" : "")}
      type="submit"
      disabled={pending}
      aria-busy={pending ? "true" : undefined}
    >
      {pending ? "Taking you to the card page…" : "Pay now by card"}
    </button>
  );
}

export function PayButton({ action }) {
  return (
    <form action={action}>
      <PayInner />
    </form>
  );
}
