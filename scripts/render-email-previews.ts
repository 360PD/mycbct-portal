/**
 * One-off: render the five branded emails with sample data → preview/*.html
 * Does not send anything.
 *
 *   npx --yes tsx scripts/render-email-previews.ts
 */
import fs from "fs";
import path from "path";
import { renderEmail } from "../lib/emails/layout";
import { fmtAppointmentDateTimeUK } from "../lib/emails/send-appointment-confirmation";

const OUT = path.join(process.cwd(), "preview");
fs.mkdirSync(OUT, { recursive: true });

const patientName = "Emma Thompson";
const patientDob = "12 March 1987";
const scanType = "Full arch CBCT";
const practiceName = "Bellegrove Dental";
const signatureName = "Dr Sarah Mitchell";
const ref = "A1B2C3D4";
const referralId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const appointmentWhen = fmtAppointmentDateTimeUK("2026-07-30T09:30:00.000Z"); // 10:30 UK BST
const signin = "https://mycbct-portal.vercel.app/sign-in";
const referralUrl = `https://mycbct-portal.vercel.app/referrals/${referralId}`;
const dashboardUrl = "https://mycbct-portal.vercel.app/dashboard";
const directionsUrl =
  "https://www.google.com/maps/place/360+Visualise/data=!4m2!3m1!1s0x0:0x9d119d3ce060fd51?sa=X&ved=1t:2428&ictx=111";

const scanFee = "£95.00";
const reportFee = "£120.00";
const totalFee = "£215.00";
const reportFeeRow = `
              <tr>
                <td style="padding:8px 0;font-size:15px;color:#4A5A6B;">Radiologist report</td>
                <td style="padding:8px 0;font-size:15px;color:#12263C;text-align:right;font-weight:600;">${reportFee}</td>
              </tr>`;

function detailsTable() {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;margin:0 0 8px 0;">
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Reference</td><td style="padding:6px 0;color:#12263C;"><strong>${ref}</strong></td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Patient</td><td style="padding:6px 0;color:#12263C;"><strong>${patientName}</strong></td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Practice</td><td style="padding:6px 0;color:#12263C;">${practiceName}</td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Scan type</td><td style="padding:6px 0;color:#12263C;">${scanType}</td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Referred by</td><td style="padding:6px 0;color:#12263C;">${signatureName}</td></tr>
      <tr><td style="padding:6px 14px 6px 0;color:#8A97A4;">Consultant report</td><td style="padding:6px 0;color:#12263C;">Requested</td></tr>
    </table>
  `;
}

function write(name: string, html: string, subject: string) {
  const file = path.join(OUT, name);
  // Comment at top so previewing in a browser still shows the subject line.
  const withMeta = `<!-- Subject: ${subject} -->\n${html}`;
  fs.writeFileSync(file, withMeta, "utf8");
  console.log("wrote", file);
}

// 1) Scan ready (dentist)
write(
  "scan-ready.html",
  renderEmail({
    preheader: `The scan you referred for ${patientName} is ready to view.`,
    heading: "Scan ready",
    bodyHtml: `
        <p style="margin:0 0 14px 0;">
          The scan you referred for <strong style="color:#12263C;">${patientName}</strong> has been completed and is ready to view.
        </p>
        <p style="margin:0 0 12px 0;">
          Log in to MyCBCT to view and download it.
        </p>`,
    button: { label: "View the scan", url: signin },
    footnote: `If the button doesn't work, paste this link into your browser:<br><a href="${signin}" style="color:#3E6E9E; word-break:break-all;">${signin}</a>`,
  }),
  `Scan ready: ${patientName}`
);

// 2) Appointment confirmation (patient)
write(
  "appointment-confirmation.html",
  renderEmail({
    preheader: `Your CBCT scan appointment is confirmed for ${appointmentWhen}.`,
    heading: "Your scan appointment is confirmed.",
    bodyHtml: `
    <p style="margin:0 0 24px 0;">Everything you need to know before you arrive.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F0E6;border:1px solid #E8E0D0;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">Your appointment</p>
          <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#12263C;line-height:1.3;">${appointmentWhen}</p>
          <div style="height:1px;background:#E8E0D0;margin-bottom:20px;"></div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:16px;vertical-align:top;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A97A4;">Location</p>
                <p style="margin:0;font-size:15px;color:#12263C;line-height:1.5;">360 Visualise<br>Octagon House<br>Bradford Road, Sandbeds<br>West Yorkshire BD20 5LY</p>
              </td>
              <td style="vertical-align:top;width:50%;">
                <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#8A97A4;">Contact us</p>
                <p style="margin:0;font-size:15px;color:#12263C;line-height:1.5;">01943 601222<br>hello@mycbct.co.uk</p>
                <p style="margin:12px 0 0;">
                  <a href="${directionsUrl}" style="color:#E0A43B;font-size:14px;font-weight:600;text-decoration:none;">Get directions →</a>
                </p>
                <p style="margin:6px 0 0;font-size:12px;color:#8A97A4;">what3words: ///half.river.surpassed</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #E8E0D0;border-radius:12px;margin-bottom:28px;">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">Your scan fees</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:8px 0;font-size:15px;color:#4A5A6B;">Scan fee</td>
              <td style="padding:8px 0;font-size:15px;color:#12263C;text-align:right;font-weight:600;">${scanFee}</td>
            </tr>
            ${reportFeeRow}
            <tr>
              <td colspan="2" style="padding:14px 0 12px;">
                <div style="height:1px;background:#E8E0D0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:16px;color:#12263C;font-weight:600;">Total</td>
              <td style="padding:4px 0;font-size:16px;color:#E0A43B;text-align:right;font-weight:700;">${totalFee}</td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:13px;color:#8A97A4;line-height:1.5;">Payment is taken on the day of your appointment.</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">What to expect</p>
    <p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#12263C;line-height:1.3;">Quick, painless, and over before you know it.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td style="width:33%;padding-right:10px;vertical-align:top;">
          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:600;color:#12263C;">15 minutes</p>
          <p style="margin:0;font-size:13px;color:#4A5A6B;line-height:1.5;">Most appointments are done from start to finish in around 15 minutes.</p>
        </td>
        <td style="width:33%;padding:0 5px;vertical-align:top;">
          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:600;color:#12263C;">10 seconds</p>
          <p style="margin:0;font-size:13px;color:#4A5A6B;line-height:1.5;">The scan itself takes just 10 seconds as the scanner rotates around your head.</p>
        </td>
        <td style="width:33%;padding-left:10px;vertical-align:top;">
          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:600;color:#12263C;">Non-invasive</p>
          <p style="margin:0;font-size:13px;color:#4A5A6B;line-height:1.5;">No needles, no discomfort. You simply stand still while the scanner does its work.</p>
        </td>
      </tr>
    </table>

    <div style="height:1px;background:#E8E0D0;margin-bottom:28px;"></div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
      <tr>
        <td style="vertical-align:top;padding-right:16px;width:50%;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">Why you've been referred</p>
          <p style="margin:0;font-size:14px;color:#4A5A6B;line-height:1.7;">The information a 3D CBCT scan gathers about your anatomy makes your dental treatment faster and safer. Your dentist can visualise structures that simply aren't visible any other way — nerves, roots, bone density, and more — helping them plan your treatment with precision.</p>
        </td>
        <td style="vertical-align:top;width:50%;">
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">How the scan helps</p>
          <p style="margin:0;font-size:14px;color:#4A5A6B;line-height:1.7;">The scan allows your dentist to visualise anatomy that cannot be diagnosed externally, helping them plan your treatment and identify the position of critical structures like nerves, teeth, and roots. You can even review your 3D image before you leave.</p>
        </td>
      </tr>
    </table>

    <div style="height:1px;background:#E8E0D0;margin-bottom:28px;"></div>

    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">Do I need to prepare?</p>
    <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:#12263C;line-height:1.3;">Very little — just remove a few items before your scan.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
      <tr>
        <td style="padding:12px 14px;background:#F4F0E6;border-radius:8px;border-left:3px solid #E0A43B;">
          <p style="margin:0;font-size:14px;color:#12263C;">Remove <strong>earrings, glasses, and hairpins</strong> before your scan — metal objects can interfere with the X-ray image.</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="padding:12px 14px;background:#F4F0E6;border-radius:8px;border-left:3px solid #E0A43B;">
          <p style="margin:0;font-size:14px;color:#12263C;">No special preparation needed beyond that. No fasting, no medication changes, nothing to bring.</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;background-color:#0E1E30;border-radius:12px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">Radiation dose</p>
          <p style="margin:0;font-size:14px;color:rgba(244,240,230,0.85);line-height:1.6;">Our CBCT scanner uses around <strong style="color:#F4F0E6;">33 times less radiation</strong> than a traditional medical CT scan. The dose is extremely low and the procedure is completely safe.</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;background-color:#E0A43B;border-radius:12px;">
      <tr>
        <td style="text-align:center;width:33%;padding:20px 8px;">
          <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#0E1E30;">75µm</p>
          <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(14,30,48,0.7);">Resolution</p>
        </td>
        <td style="text-align:center;width:33%;padding:20px 8px;border-left:1px solid rgba(14,30,48,0.2);border-right:1px solid rgba(14,30,48,0.2);">
          <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#0E1E30;">10 sec</p>
          <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(14,30,48,0.7);">Scan time</p>
        </td>
        <td style="text-align:center;width:33%;padding:20px 8px;">
          <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:#0E1E30;">3D</p>
          <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(14,30,48,0.7);">Full image</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#E0A43B;font-weight:700;">Need to rebook?</p>
    <p style="margin:0 0 16px;font-size:15px;color:#4A5A6B;line-height:1.6;">If you need to change or cancel your appointment, please give us as much notice as possible so we can offer the slot to another patient.</p>
    <p style="margin:0 0 4px;font-size:15px;color:#12263C;">
      <a href="tel:01943601222" style="color:#12263C;font-weight:600;text-decoration:none;">Call 01943 601222</a>
      &nbsp;·&nbsp;
      <a href="mailto:hello@mycbct.co.uk" style="color:#12263C;font-weight:600;text-decoration:none;">hello@mycbct.co.uk</a>
    </p>
  `,
    footnote:
      "This email was sent because your dentist referred you for a CBCT scan at MyCBCT. If you have any questions, call us on 01943 601222.",
  }),
  `Your CBCT scan appointment is confirmed — ${patientName}`
);

// 3) DNA notice
write(
  "dna-notice.html",
  renderEmail({
    preheader: `${patientName} did not attend their appointment.`,
    heading: `We're sorry to let you know that ${patientName} did not attend their appointment.`,
    bodyHtml: `
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
                <p style="margin:0;font-size:15px;color:#12263C;line-height:1.5;">${patientDob}</p>
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
  `,
    footnote:
      '<a href="tel:01943601222" style="color:#8A97A4;text-decoration:none;">01943 601222</a> &nbsp;·&nbsp; <a href="mailto:hello@mycbct.co.uk" style="color:#8A97A4;text-decoration:none;">hello@mycbct.co.uk</a>',
  }),
  `Did not attend: ${patientName} — MyCBCT`
);

const details = detailsTable();

// 4) New referral (team)
write(
  "new-referral.html",
  renderEmail({
    preheader: `New referral for ${patientName} — ${scanType}.`,
    heading: "New referral received",
    bodyHtml: details,
    button: { label: "Open this referral in MyCBCT", url: referralUrl },
  }),
  `New referral: ${patientName} — ${scanType} (${practiceName})`
);

// 5) Referral received (dentist)
write(
  "referral-received.html",
  renderEmail({
    preheader: `We've received your referral for ${patientName}.`,
    heading: "Thank you — your referral is in",
    bodyHtml: `
          <p style="margin:0 0 20px 0;">
            We've received your referral for <strong style="color:#12263C;">${patientName}</strong>.
            We'll take it from here &mdash; you'll get another email when the scan
            is ready to view.
          </p>
          ${details}`,
    button: { label: "View your referrals in MyCBCT", url: dashboardUrl },
    footnote: "Questions? Reply to this email or call 360 Visualise.",
  }),
  `Referral received: ${patientName} (ref ${ref})`
);

console.log("Done. Open the files in preview/ in a browser.");
