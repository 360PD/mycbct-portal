// Shared scanning-diary maths.
//
// The staff booking page and the patient booking page must offer exactly the
// same times. They each had their own copy of this logic for a while; if the
// two ever drifted, a dentist and a patient would see different availability
// for the same day. One copy, used by both.

export const SLOT_MINUTES = 30;

export function pad(n) {
  return String(n).padStart(2, "0");
}

// Today's date in London as "YYYY-MM-DD".
export function londonToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date());
}

// Convert a London wall-clock time (day "YYYY-MM-DD", time "HH:MM") to a
// correct UTC ISO string, handling BST/GMT automatically.
export function londonSlotISO(day, time) {
  for (const off of ["+01:00", "+00:00"]) {
    const d = new Date(`${day}T${time}:00${off}`);
    const shown = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
    if (shown === time) return d.toISOString();
  }
  return new Date(`${day}T${time}:00+00:00`).toISOString();
}

// "09:00:00" -> minutes since midnight.
export function toMinutes(t) {
  const s = String(t || "");
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}

// Build the slot times offered by a day's open sessions.
export function buildSlotTimes(sessions) {
  const times = new Set();
  for (const sess of sessions || []) {
    const start = toMinutes(sess.start_time);
    const end = toMinutes(sess.end_time);
    for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      times.add(`${pad(h)}:${pad(min)}`);
    }
  }
  return Array.from(times).sort();
}

export function isWeekend(dayStr) {
  const dow = new Date(dayStr + "T12:00:00Z").getUTCDay();
  return dow === 0 || dow === 6;
}

// "Tuesday 15 September"
export function fmtDayFriendly(dayStr) {
  return new Date(dayStr + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// "9:30am"
export function fmtTimeFriendly(iso) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value || "";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const period = parts.find((p) => p.type === "dayPeriod")?.value?.toLowerCase() || "";
  return `${hour}:${minute}${period}`;
}
