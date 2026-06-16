import fs from "fs";
import path from "path";
import { fmtAppointmentDateTimeUK } from "@/lib/emails/send-appointment-confirmation";

function loadTemplate() {
  const templatePath = path.join(process.cwd(), "lib/emails/dna-notice.html");
  return fs.readFileSync(templatePath, "utf8");
}

function fillTemplate(html: string, vars: Record<string, string>) {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

function fmtDateUK(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type DnaEmailOpts = {
  dentistEmail: string;
  patientEmail?: string | null;
  patientName: string;
  patientDob?: string | null;
  scanTypeName: string;
  startsAtISO: string;
};

// Best-effort DNA notice to the referring dentist, CC patient if we have their email.
export async function sendDnaNotice({
  dentistEmail,
  patientEmail,
  patientName,
  patientDob,
  scanTypeName,
  startsAtISO,
}: DnaEmailOpts) {
  const key = process.env.RESEND_API_KEY;
  const to = String(dentistEmail || "").trim();
  if (!key || !to) return;

  const html = fillTemplate(loadTemplate(), {
    PATIENT_NAME: patientName || "your patient",
    APPOINTMENT_DATE_TIME: fmtAppointmentDateTimeUK(startsAtISO),
    SCAN_TYPE: scanTypeName || "—",
    PATIENT_DOB: fmtDateUK(patientDob),
  });

  const cc = String(patientEmail || "").trim();
  const payload: Record<string, unknown> = {
    from: "MyCBCT <hello@mycbct.co.uk>",
    to: [to],
    subject: `Did not attend: ${patientName || "patient"} — MyCBCT`,
    html,
  };
  if (cc) payload.cc = [cc];

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("DNA notice email failed:", e);
  }
}
