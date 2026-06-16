import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";

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

function fmtMoneyGBP(pence: number | null | undefined) {
  const amount = Number(pence) || 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function fillTemplate(html: string, vars: Record<string, string>) {
  let out = html;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return out;
}

const DEFAULT_REPORT_FEE_PENCE = 12000;

type AppointmentEmailOpts = {
  to: string;
  startsAtISO: string;
  referralId: string;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  dentistName?: string | null;
};

// Best-effort patient confirmation. Never throws — booking must not depend on mail.
export async function sendAppointmentConfirmation({
  to,
  startsAtISO,
  referralId,
  patientFirstName,
  patientLastName,
  dentistName,
}: AppointmentEmailOpts) {
  const key = process.env.RESEND_API_KEY;
  const email = String(to || "").trim();
  if (!key || !email) return;

  const appointmentWhen = fmtAppointmentDateTimeUK(startsAtISO);

  let scanFee = "£0.00";
  let reportFee = fmtMoneyGBP(DEFAULT_REPORT_FEE_PENCE);
  let reportFeeRow = "";
  let totalFee = "£0.00";

  try {
    const supabase = await createClient();
    const { data: ref } = await supabase
      .from("referrals")
      .select("scan_fee_pence, report_fee_pence, report_requested")
      .eq("id", referralId)
      .maybeSingle();

    const scanPence = Number(ref?.scan_fee_pence) || 0;
    const reportPence = Number(ref?.report_fee_pence) || DEFAULT_REPORT_FEE_PENCE;
    const reportRequested = !!ref?.report_requested;

    scanFee = fmtMoneyGBP(scanPence);
    reportFee = fmtMoneyGBP(reportPence);
    const totalPence = scanPence + (reportRequested ? reportPence : 0);
    totalFee = fmtMoneyGBP(totalPence);

    if (reportRequested) {
      reportFeeRow = `
            <tr>
              <td style="padding:8px 0;font-size:15px;color:rgba(247,244,236,0.75);">Radiologist report</td>
              <td style="padding:8px 0;font-size:15px;color:#f7f4ec;text-align:right;font-weight:600;">${reportFee}</td>
            </tr>`;
    }
  } catch (e) {
    console.error("appointment confirmation fee lookup failed:", e);
  }

  void dentistName;

  const html = fillTemplate(loadTemplate(), {
    APPOINTMENT_DATE_TIME: appointmentWhen,
    SCAN_FEE: scanFee,
    REPORT_FEE_ROW: reportFeeRow,
    TOTAL_FEE: totalFee,
  });

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
