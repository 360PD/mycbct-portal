"use client";

import { useState } from "react";

// DiaryCalendar — instant click feedback, saves in the background.
// The page recolours the day immediately; the database write happens
// behind the scenes. If a save fails, the day snaps back and explains.
//
// v2 — asks before closing a day that already has bookings on it.
//      Closing a day doesn't cancel its appointments, it just takes the day
//      off the calendar, so patients keep a slot nobody is expecting them in.
//      Everything else still cycles with a single click.

const NEXT_STATE = { closed: "am", am: "pm", pm: "full", full: "closed", custom: "closed" };

const STATE_LABEL = { closed: "", am: "AM", pm: "PM", full: "Full", custom: "Open" };

const MONTH_NAME = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function isWeekend(dayStr) {
  const dow = new Date(dayStr + "T12:00:00Z").getUTCDay();
  return dow === 0 || dow === 6;
}

function prettyDay(dayStr) {
  return new Date(dayStr + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function buildMonth(year, month) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=Sun
  const lead = (firstDow + 6) % 7; // blanks before day 1, Monday-start
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${pad(month)}-${pad(d)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function DiaryCalendar({ months, initialStates, bookings, today, saveDay }) {
  const [states, setStates] = useState(initialStates || {});
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null); // { day, from, to, count }

  // The actual change: recolour now, save behind the scenes, snap back on failure.
  async function applyChange(dayStr, current, next) {
    setStates((s) => ({ ...s, [dayStr]: next }));
    setError("");
    setConfirm(null);

    try {
      const res = await saveDay(dayStr, next);
      if (res && res.error) throw new Error(res.error);
    } catch (e) {
      setStates((s) => ({ ...s, [dayStr]: current }));
      setError(
        "That change didn't save (" +
          (e.message || "unknown error") +
          "). The day has been put back — try again."
      );
    }
  }

  function handleClick(dayStr) {
    const current = states[dayStr] || "closed";
    const next = NEXT_STATE[current] || "closed";
    const count = bookings[dayStr] || 0;

    // Closing a day with patients booked into it needs a deliberate second step.
    if (next === "closed" && count > 0) {
      setError("");
      setConfirm({ day: dayStr, from: current, to: next, count });
      return;
    }

    applyChange(dayStr, current, next);
  }

  return (
    <div>
      {error ? <p className="dy-error">{error}</p> : null}

      {confirm ? (
        <div className="dy-confirm" role="alertdialog" aria-live="assertive">
          <p className="dy-confirm-t">
            {prettyDay(confirm.day)} has {confirm.count}{" "}
            {confirm.count === 1 ? "patient booked in" : "patients booked in"}.
          </p>
          <p className="dy-confirm-s">
            Closing the day won&rsquo;t cancel{" "}
            {confirm.count === 1 ? "that appointment" : "those appointments"} — the
            {confirm.count === 1 ? " patient" : " patients"} will still turn up. Cancel{" "}
            {confirm.count === 1 ? "it" : "them"} on the referral first if the day
            isn&rsquo;t going ahead.
          </p>
          <div className="dy-confirm-row">
            <button
              type="button"
              className="dy-btn-keep"
              onClick={() => setConfirm(null)}
              autoFocus
            >
              Leave the day open
            </button>
            <button
              type="button"
              className="dy-btn-close"
              onClick={() => applyChange(confirm.day, confirm.from, confirm.to)}
            >
              Close it anyway
            </button>
          </div>
        </div>
      ) : null}

      <div className="dy-months">
        {months.map(({ year, month }) => (
          <section className="dy-month" key={year + "-" + month}>
            <h2 className="dy-month-name">{MONTH_NAME[month - 1]} {year}</h2>
            <div className="dy-grid">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                <span className="dy-dow" key={d}>{d}</span>
              ))}
              {buildMonth(year, month).map((dayStr, i) => {
                if (!dayStr) return <span className="dy-blank" key={"b" + i}></span>;

                const weekend = isWeekend(dayStr);
                const past = dayStr < today;
                const state = states[dayStr] || "closed";
                const count = bookings[dayStr] || 0;
                const dayNum = Number(dayStr.slice(8, 10));
                const locked = weekend || past;
                const pending = confirm && confirm.day === dayStr;

                const cls =
                  "dy-day " + state +
                  (locked ? " locked" : "") +
                  (pending ? " pending" : "") +
                  (dayStr === today ? " today" : "");

                const inner = (
                  <span className="dy-day-inner">
                    <span className="dy-num">{dayNum}</span>
                    <span className="dy-state">{STATE_LABEL[state]}</span>
                    {count > 0 ? <span className="dy-count">{count} booked</span> : null}
                  </span>
                );

                if (locked) {
                  return <span className={cls} key={dayStr}>{inner}</span>;
                }

                return (
                  <button
                    className={cls}
                    key={dayStr}
                    type="button"
                    onClick={() => handleClick(dayStr)}
                    title={
                      count > 0
                        ? count + " booked — " + prettyDay(dayStr)
                        : "Change " + prettyDay(dayStr)
                    }
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <style>{`
        .dy-error{background:rgba(220,80,80,.15);border:1px solid rgba(220,80,80,.4);
          color:#ffb4b4;border-radius:10px;padding:12px 14px;font-size:14px;margin:0 0 18px;}
        .dy-confirm{background:rgba(231,140,59,.14);border:1px solid rgba(231,174,59,.5);
          border-radius:12px;padding:16px 18px;margin:0 0 20px;}
        .dy-confirm-t{margin:0 0 6px;font-size:15.5px;font-weight:700;color:#f0c26a;}
        .dy-confirm-s{margin:0 0 14px;font-size:14px;line-height:1.55;
          color:rgba(247,244,236,.75);}
        .dy-confirm-row{display:flex;gap:10px;flex-wrap:wrap;}
        .dy-confirm-row button{font:inherit;font-size:14.5px;font-weight:600;cursor:pointer;
          border-radius:999px;padding:10px 20px;}
        .dy-btn-keep{background:#e7ae3b;color:#0e1b2e;border:none;}
        .dy-btn-keep:hover{filter:brightness(1.07);}
        .dy-btn-close{background:transparent;color:rgba(247,244,236,.8);
          border:1px solid rgba(247,244,236,.3);}
        .dy-btn-close:hover{border-color:#e08a7a;color:#e08a7a;}
        .dy-months{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:26px;}
        .dy-month{background:rgba(247,244,236,.04);border:1px solid rgba(247,244,236,.08);
          border-radius:16px;padding:20px;}
        .dy-month-name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;
          margin:0 0 14px;}
        .dy-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;}
        .dy-dow{font-size:11px;letter-spacing:.06em;text-transform:uppercase;
          color:rgba(247,244,236,.4);text-align:center;padding-bottom:4px;}
        .dy-blank{min-height:52px;}
        .dy-day{appearance:none;border:1px solid rgba(247,244,236,.12);background:rgba(247,244,236,.03);
          color:#f7f4ec;font:inherit;border-radius:9px;min-height:52px;padding:5px 3px;
          cursor:pointer;text-align:center;display:block;width:100%;}
        .dy-day:hover{border-color:#e7ae3b;}
        .dy-day.am{background:rgba(231,174,59,.18);border-color:rgba(231,174,59,.4);}
        .dy-day.pm{background:rgba(231,174,59,.32);border-color:rgba(231,174,59,.55);}
        .dy-day.full{background:rgba(231,174,59,.55);border-color:#e7ae3b;}
        .dy-day.full .dy-num,.dy-day.full .dy-state{color:#10131a;}
        .dy-day.custom{background:rgba(120,200,160,.2);border-color:rgba(120,200,160,.45);}
        .dy-day.locked{opacity:.3;cursor:default;pointer-events:none;}
        .dy-day.today{outline:2px solid rgba(247,244,236,.5);outline-offset:1px;}
        .dy-day.pending{outline:2px solid #e7ae3b;outline-offset:2px;}
        .dy-day-inner{display:flex;flex-direction:column;gap:1px;align-items:center;}
        .dy-num{font-size:14px;font-weight:600;line-height:1.2;}
        .dy-state{font-size:10px;letter-spacing:.05em;text-transform:uppercase;
          color:#e7ae3b;font-weight:700;min-height:12px;line-height:1.2;}
        .dy-count{font-size:10px;color:rgba(247,244,236,.75);line-height:1.2;}
        .dy-day.full .dy-count{color:#10131a;}
        @media(max-width:560px){.dy-months{grid-template-columns:1fr;}}
      `}</style>
    </div>
  );
}
