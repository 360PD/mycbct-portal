import { fmtAppointmentDateTimeUK } from "@/lib/emails/send-appointment-confirmation";
import { renderEmail } from "@/lib/emails/layout";

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

  const name = patientName || "your patient";
  const appointmentWhen = fmtAppointmentDateTimeUK(startsAtISO);
  const dob = fmtDateUK(patientDob);
  const scanType = scanTypeName || "—";

  const bodyHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F0E6;border:1px solid #E8E0D0;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">Missed appointment</p>
          <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#12263C;line-height:1.35;">${appointmentWhen}</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:8px 16px 8px 0;vertical-align:top;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A97A4;">Scan type</p>
                <p style="margin:0;font-size:15px;color:#12263C;line-height:1.5;">${scanType}</p>
              </td>
              <td style="padding:8px 0;vertical-align:top;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A97A4;">Date of birth</p>
                <p style="margin:0;font-size:15px;color:#12263C;line-height:1.5;">${dob}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0;">
      We understand that circumstances sometimes prevent patients from attending. If you'd like to rebook, please contact us on
      <a href="tel:01943601222" style="color:#12263C;font-weight:600;text-decoration:none;">01943 601222</a>
      or
      <a href="mailto:hello@mycbct.co.uk" style="color:#12263C;font-weight:600;text-decoration:none;">hello@mycbct.co.uk</a>
      and we'll be happy to find a new slot.
    </p>
  `;

  const html = renderEmail({
    preheader: `${name} did not attend their appointment.`,
    heading: `We're sorry to let you know that ${name} did not attend their appointment.`,
    bodyHtml,
    footnote:
      '<a href="tel:01943601222" style="color:#8A97A4;text-decoration:none;">01943 601222</a> &nbsp;·&nbsp; <a href="mailto:hello@mycbct.co.uk" style="color:#8A97A4;text-decoration:none;">hello@mycbct.co.uk</a>',
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
