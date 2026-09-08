import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { renderEmail } from "@/lib/emails/layout";

// v3 — reads the fees with the service-role key.
//
// This ran on the signed-in user's client, which works when staff or a dentist
// books. But a patient booking their own scan from an emailed link is not
// signed in at all, so row-level security returned nothing and the fee lookup
// silently produced "Scan fee £0.00". Rachel's test booking on 8 Sept 2026
// showed £0.00 against a referral that had £149.00 stored on it.
//
// This is a system email about one known referral, so it reads with the
// service key and falls back to the user client if that key is missing.
function feeReader() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// v2 — falls back to the scan type's list price when the referral has no fee
// stamped on it. Every referral created before 4 Sept 2026 has a null
// scan_fee_pence, which made this email quote "Scan fee £0.00, Total £0.00".
// New referrals carry their own price (app/refer/actions.ts v6); this is the
// safety net for the 2,244 historical rows.

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

function fmtMoneyGBP(pence: number | null | undefined) {
  const amount = Number(pence) || 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

const DEFAULT_REPORT_FEE_PENCE = 16500;

const DIRECTIONS_URL =
  "https://www.google.com/maps/place/360+Visualise/data=!4m2!3m1!1s0x0:0x9d119d3ce060fd51?sa=X&ved=1t:2428&ictx=111";

type ScanTypeFees = {
  base_price?: number | null;
  report_price_pence?: number | null;
};

// Shape of the fee lookup below. Written out because the embed isn't in the
// generated database types.
type FeeRow = {
  scan_fee_pence?: number | null;
  report_fee_pence?: number | null;
  report_requested?: boolean | null;
  scan_types?: ScanTypeFees | ScanTypeFees[] | null;
};

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
    const supabase = feeReader() || (await createClient());
    const { data } = await supabase
      .from("referrals")
      .select(
        "scan_fee_pence, report_fee_pence, report_requested, " +
          "scan_types(base_price, report_price_pence)"
      )
      .eq("id", referralId)
      .maybeSingle();

    // The generated types don't describe this embed, so name the shape once
    // here rather than casting at every use.
    const ref = (data as unknown as FeeRow | null) ?? null;

    // The embed comes back as an object or a single-item array depending on
    // how PostgREST reads the relationship. Normalise before use.
    const rawType = ref?.scan_types;
    const scanType = Array.isArray(rawType) ? rawType[0] : rawType;

    // Prefer the price stamped on the referral. Fall back to the scan type's
    // current list price, and only then to the default.
    const scanPence =
      Number(ref?.scan_fee_pence) || Number(scanType?.base_price) || 0;
    const reportPence =
      Number(ref?.report_fee_pence) ||
      Number(scanType?.report_price_pence) ||
      DEFAULT_REPORT_FEE_PENCE;
    const reportRequested = !!ref?.report_requested;

    if (!scanPence) {
      console.error(
        "appointment confirmation: no scan fee found for referral",
        referralId,
        "— row read?",
        !!ref
      );
    }

    scanFee = fmtMoneyGBP(scanPence);
    reportFee = fmtMoneyGBP(reportPence);
    const totalPence = scanPence + (reportRequested ? reportPence : 0);
    totalFee = fmtMoneyGBP(totalPence);

    if (reportRequested) {
      reportFeeRow = `
              <tr>
                <td style="padding:8px 0;font-size:15px;color:#4A5A6B;">Radiologist report</td>
                <td style="padding:8px 0;font-size:15px;color:#12263C;text-align:right;font-weight:600;">${reportFee}</td>
              </tr>`;
    }
  } catch (e) {
    console.error("appointment confirmation fee lookup failed:", e);
  }

  void dentistName;

  const bodyHtml = `
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
                  <a href="${DIRECTIONS_URL}" style="color:#E0A43B;font-size:14px;font-weight:600;text-decoration:none;">Get directions →</a>
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
  `;

  const patientName = [patientFirstName, patientLastName].filter(Boolean).join(" ").trim();
  const subject = patientName
    ? `Your CBCT scan appointment is confirmed — ${patientName}`
    : "Your CBCT scan appointment is confirmed — MyCBCT";

  const html = renderEmail({
    preheader: `Your CBCT scan appointment is confirmed for ${appointmentWhen}.`,
    heading: "Your scan appointment is confirmed.",
    bodyHtml,
    footnote:
      "This email was sent because your dentist referred you for a CBCT scan at MyCBCT. If you have any questions, call us on 01943 601222.",
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
    console.error("appointment confirmation email failed:", e);
  }
}
