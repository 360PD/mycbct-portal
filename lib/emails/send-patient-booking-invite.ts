import { renderEmail } from "@/lib/emails/layout";

// v1 — "your dentist has referred you, book your own scan".
//
// Sent when a dentist submits a referral and asks us to contact the patient
// rather than booking there and then. The link goes to /book/<token>, which
// needs no login and no account.
//
// Written for a patient, not a dentist: no jargon, one thing to do, and the
// phone number in the message so anyone who would rather ring still can.
// Best-effort — a mail failure must never undo a saved referral.

type Opts = {
  to: string;
  bookingUrl: string;
  patientFirstName?: string | null;
  dentistName?: string | null;
  practiceName?: string | null;
  scanTypeName?: string | null;
};

const PHONE = "01943 601222";

export async function sendPatientBookingInvite({
  to,
  bookingUrl,
  patientFirstName,
  dentistName,
  practiceName,
  scanTypeName,
}: Opts) {
  const key = process.env.RESEND_API_KEY;
  const email = String(to || "").trim();
  if (!key || !email) return;

  const firstName = (patientFirstName || "").trim();
  const greeting = firstName ? `Hello ${firstName},` : "Hello,";
  const referrer = [dentistName, practiceName].filter(Boolean).join(" at ");

  const bodyHtml = `
    <p style="margin:0 0 18px 0;font-size:17px;">${greeting}</p>

    <p style="margin:0 0 18px 0;font-size:17px;line-height:1.65;">
      ${
        referrer
          ? `<strong style="color:#12263C;">${referrer}</strong> has referred you`
          : "Your dentist has referred you"
      }
      for a${scanTypeName ? ` ${scanTypeName.toLowerCase()}` : " CBCT"} scan with us
      at 360 Visualise.
    </p>

    <p style="margin:0 0 24px 0;font-size:17px;line-height:1.65;">
      You can pick an appointment time yourself using the button below. There is
      nothing to sign up for and no password to remember — just choose a time
      that suits you.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F0E6;border:1px solid #E8E0D0;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:22px 26px;">
          <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">
            What to expect
          </p>
          <p style="margin:0 0 10px;font-size:16px;color:#12263C;line-height:1.6;">
            <strong>It takes about 15 minutes</strong> from arriving to leaving.
          </p>
          <p style="margin:0 0 10px;font-size:16px;color:#12263C;line-height:1.6;">
            <strong>The scan itself lasts 10 seconds.</strong> You stand still while
            the scanner moves around your head.
          </p>
          <p style="margin:0;font-size:16px;color:#12263C;line-height:1.6;">
            <strong>Nothing touches you and it doesn't hurt.</strong> No needles,
            and you can go straight back to your day afterwards.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px 0;font-size:17px;line-height:1.65;">
      If you would rather book over the phone, or you have any questions at all,
      please ring us on <strong style="color:#12263C;">${PHONE}</strong> —
      we're here Monday to Friday, 9am to 5pm.
    </p>
  `;

  const subject = firstName
    ? `${firstName}, book your CBCT scan appointment`
    : "Book your CBCT scan appointment";

  const html = renderEmail({
    preheader: "Your dentist has referred you for a scan — pick a time that suits you.",
    heading: "Book your scan appointment",
    bodyHtml,
    button: { label: "Choose my appointment time", url: bookingUrl },
    footnote: `You've received this because your dentist referred you to 360 Visualise for a CBCT scan. Any questions, call us on ${PHONE}.`,
  });

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
    console.error("patient booking invite email failed:", e);
  }
}
