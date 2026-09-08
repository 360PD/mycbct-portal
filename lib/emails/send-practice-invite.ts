import { renderEmail } from "@/lib/emails/layout";

// v1 — "there's a scanning centre on your doorstep".
//
// A cold-ish introduction to local practices. Sent one at a time, never as a
// group — seventeen practices seeing each other's addresses would be both
// embarrassing and a data protection problem. Rachel is copied on each so the
// thread lives in her inbox and replies land somewhere useful.
//
// Sent as Rachel rather than a no-reply address on purpose: the whole point is
// that a practice manager can hit reply and get a person.
//
// CHECK THESE BEFORE SENDING — they are claims we make to strangers.
export const CENTRE = {
  name: "360 Visualise",
  addressLines: [
    "Octagon House",
    "Bradford Road, Sandbeds",
    "Keighley, West Yorkshire BD20 5LY",
  ],
  phone: "01943 601222",
  contactName: "Rachel",
  contactEmail: "rachelh@360v.co.uk",
  reportTurnaround: "3 working days",
  siteUrl: "https://www.mycbct.co.uk",
};

const PRICES = [
  ["OPG (panoramic)", "£65"],
  ["Small scan — small field of view", "£125"],
  ["Single jaw", "£149"],
  ["Dual jaw", "£199"],
  ["Consultant radiologist report", "from £105"],
];

export type InviteResult = {
  email: string;
  ok: boolean;
  error?: string;
};

function priceRows() {
  return PRICES.map(
    ([label, price], i) => `
      <tr>
        <td style="padding:11px 0;border-bottom:${
          i === PRICES.length - 1 ? "none" : "1px solid #EFE8D8"
        };font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#12263C;">
          ${label}
        </td>
        <td align="right" style="padding:11px 0;border-bottom:${
          i === PRICES.length - 1 ? "none" : "1px solid #EFE8D8"
        };font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#12263C;white-space:nowrap;">
          ${price}
        </td>
      </tr>`
  ).join("");
}

export function inviteHtml() {
  const bodyHtml = `
    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;">
      Hello,
    </p>

    <p style="margin:0 0 18px 0;font-size:16px;line-height:1.65;">
      I'm ${CENTRE.contactName}, and I look after referrals at our CBCT scanning
      centre at <strong style="color:#12263C;">Octagon House in Sandbeds</strong>
      — a few minutes from you, with free parking outside the door.
    </p>

    <p style="margin:0 0 26px 0;font-size:16px;line-height:1.65;">
      If you've been sending patients to Leeds or Manchester for a scan, you
      probably don't need to any more. Here's what we do.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F0E6;border:1px solid #E8E0D0;border-radius:12px;margin:0 0 26px 0;">
      <tr>
        <td style="padding:24px 26px;">
          <p style="margin:0 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A8791F;font-weight:700;">
            Referring takes about two minutes
          </p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#12263C;">
            <strong>1.</strong> Send us the referral online — patient details,
            the region you want and why. No paperwork, no faxes.
          </p>
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.6;color:#12263C;">
            <strong>2.</strong> Book the slot yourself while the patient is still
            with you, or let us email them a link to pick their own time. If they
            don't, we ring them.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#12263C;">
            <strong>3.</strong> The scan is with you securely as soon as it's
            done. The patient is in and out in about fifteen minutes.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A8791F;font-weight:700;">
      Reporting, if you want it
    </p>
    <p style="margin:0 0 26px 0;font-size:16px;line-height:1.65;">
      Report it yourself, or we'll arrange a full written report from a
      GDC-registered consultant radiologist — typically back within
      ${CENTRE.reportTurnaround}. Useful for the incidental findings nobody
      wants to be the one to miss.
    </p>

    <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A8791F;font-weight:700;">
      What it costs
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
      ${priceRows()}
    </table>
    <p style="margin:0 0 26px 0;font-size:14px;line-height:1.6;color:#7A8794;">
      The patient can pay us directly by card when they book, or at reception on
      the day — so it needn't touch your books at all.
    </p>

    <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#A8791F;font-weight:700;">
      Where to find us
    </p>
    <p style="margin:0 0 26px 0;font-size:16px;line-height:1.65;">
      ${CENTRE.name}<br>
      ${CENTRE.addressLines.join("<br>")}<br>
      <span style="color:#7A8794;">Free parking on site.</span>
    </p>

    <p style="margin:0 0 8px 0;font-size:16px;line-height:1.65;">
      If you'd like your practice set up, just reply to this email or ring me on
      <strong style="color:#12263C;">${CENTRE.phone}</strong> and I'll do the
      rest. Happy to pop in with a price list if that's easier.
    </p>

    <p style="margin:0;font-size:16px;line-height:1.65;">
      Best wishes,<br>
      <strong style="color:#12263C;">${CENTRE.contactName}</strong><br>
      <span style="color:#7A8794;">${CENTRE.name}</span>
    </p>
  `;

  return renderEmail({
    preheader:
      "A CBCT scanning centre on your doorstep — referrals in two minutes, reports if you want them.",
    badge: "Now scanning in Sandbeds",
    heading: "There's a CBCT scanner five minutes away",
    bodyHtml,
    button: { label: "See how it works", url: CENTRE.siteUrl },
    footnote: `You've received this because we're introducing our scanning centre to dental practices nearby. If you'd rather we didn't write again, reply with "no thanks" and we'll remove you. ${CENTRE.name}, ${CENTRE.addressLines.join(", ")}.`,
  });
}

export const INVITE_SUBJECT =
  "CBCT scanning in Sandbeds — referrals, reports and prices";

// One email per practice. Rachel is copied so replies and the thread land in
// her inbox. Returns a result per address rather than throwing, so one bad
// address can't stop the rest.
export async function sendPracticeInvite(to: string): Promise<InviteResult> {
  const key = process.env.RESEND_API_KEY;
  const email = String(to || "").trim();

  if (!key) return { email, ok: false, error: "RESEND_API_KEY is not set" };
  if (!email) return { email, ok: false, error: "no address" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${CENTRE.contactName} at ${CENTRE.name} <${CENTRE.contactEmail}>`,
        to: [email],
        cc: [CENTRE.contactEmail],
        reply_to: CENTRE.contactEmail,
        subject: INVITE_SUBJECT,
        html: inviteHtml(),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        email,
        ok: false,
        error: body?.message || body?.error?.message || `Resend said ${res.status}`,
      };
    }

    return { email, ok: true };
  } catch (e) {
    return { email, ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}
