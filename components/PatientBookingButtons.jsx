"use client";

// The buttons a patient presses, with feedback.
//
// v2 — every day with a free slot is listed, each one closed until it's
// tapped. Showing only the next fifteen times hid most of the diary, and a
// long wall of times is hard going on a phone. A closed row per day is short
// enough to scan and says how many times are inside.
//
// v1 — the booking page is a server component, so pressing a time button is a
// round trip to the server. That takes a second or two, and until this existed
// the button did nothing visible in the meantime — no colour change, no
// movement. A patient reasonably concludes it didn't work and presses again.
//
// useFormStatus tells us the form is in flight, so the button we pressed says
// "Booking…" and every other button goes flat and unclickable. That also stops
// somebody booking two slots by tapping twice.
//
// All the times live in ONE form so they all know when one of them is working.
// The open/closed state of each day is held here rather than left to the
// browser, because the form re-renders while it's submitting and an
// uncontrolled <details> would spring back open.

import { useState } from "react";
import { useFormStatus } from "react-dom";

function DayList({ days, openDays, onToggle, picked, onPick }) {
  const { pending } = useFormStatus();

  return (
    <div className="pb-days">
      {days.map((d) => (
        <details
          className="pb-daybox"
          key={d.day}
          open={openDays.has(d.day)}
          onToggle={(e) => onToggle(d.day, e.currentTarget.open)}
        >
          <summary className="pb-daysum">
            <span className="pb-dayname">{d.label}</span>
            <span className="pb-daycount">
              {d.slots.length} {d.slots.length === 1 ? "time" : "times"}
            </span>
          </summary>

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
        </details>
      ))}
    </div>
  );
}

export function PatientSlots({ action, days }) {
  const [picked, setPicked] = useState("");
  // The soonest day starts open, so nobody has to guess that these expand.
  const [openDays, setOpenDays] = useState(
    () => new Set(days[0] ? [days[0].day] : [])
  );

  function toggle(day, isOpen) {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(day);
      else next.delete(day);
      return next;
    });
  }

  return (
    <form action={action}>
      <DayList
        days={days}
        openDays={openDays}
        onToggle={toggle}
        picked={picked}
        onPick={setPicked}
      />
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
