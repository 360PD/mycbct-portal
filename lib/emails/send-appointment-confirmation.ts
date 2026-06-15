import fs from "fs";
import path from "path";

export function fmtAppointmentDateTimeUK(iso: string) {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);

  const hour = parts.find((p) => p.type === "hour")?.value || "";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value?.toLowerCase() || "";

  return `${datePart} at ${hour}:${minute}${dayPeriod}`;
}

function loadTemplate() {
  const templatePath = path.join(
    process.cwd(),
    "lib/emails/appointment-confirmation.html"
  );
  return fs.readFileSync(templatePath, "utf8");
}

type AppointmentEmailOpts = {
  to: string;
  startsAtISO: string;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  dentistName?: string | null;
};

// Best-effort patient confirmation. Never throws — booking must not depend on mail.
export async function sendAppointmentConfirmation({
  to,
  startsAtISO,
  patientFirstName,
  patientLastName,
  dentistName,
}: AppointmentEmailOpts) {
  const key = process.env.RESEND_API_KEY;
  const email = String(to || "").trim();
  if (!key || !email) return;

  const appointmentWhen = fmtAppointmentDateTimeUK(startsAtISO);
  const html = loadTemplate().replace(/\{\{APPOINTMENT_DATE_TIME\}\}/g, appointmentWhen);

  const patientName = [patientFirstName, patientLastName].filter(Boolean).join(" ").trim();
  const subject = patientName
    ? `Your CBCT scan appointment is confirmed — ${patientName}`
    : "Your CBCT scan appointment is confirmed — MyCBCT";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MyCBCT <hello@mycbct.co.uk>",
        to: [email],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("appointment confirmation email failed:", e);
  }
}
