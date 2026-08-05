export type EmailButton = {
  label: string;
  url: string;
};

export type RenderEmailOpts = {
  preheader: string;
  badge?: string;
  heading: string;
  bodyHtml: string;
  button?: EmailButton;
  footnote?: string;
};

/**
 * Shared branded HTML shell for all MyCBCT Resend emails.
 * Table-based + inline CSS for email-client compatibility.
 * Design: navy header (#0E1E30), gold CBCT (#E0A43B), cream footer.
 */
export function renderEmail({
  preheader,
  badge,
  heading,
  bodyHtml,
  button,
  footnote,
}: RenderEmailOpts): string {
  const badgeBlock = badge
    ? `
              <p style="margin:0 0 12px 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:2.5px; text-transform:uppercase; color:#E0A43B; font-weight:700;">
                ${badge}
              </p>`
    : "";

  const buttonBlock = button
    ? `
          <tr>
            <td align="center" style="padding:4px 48px 8px 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#E0A43B" style="border-radius:10px;">
                    <a href="${escapeAttr(button.url)}"
                       style="display:inline-block; padding:16px 40px; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:bold; color:#12263C; text-decoration:none; border-radius:10px;">
                      ${escapeHtml(button.label)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : "";

  const footnoteBlock = footnote
    ? `
          <tr>
            <td style="padding:20px 48px 40px 48px;">
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.5; color:#A6B0BA;">
                ${footnote}
              </p>
            </td>
          </tr>`
    : `
          <tr>
            <td style="padding:0 0 32px 0; font-size:0; line-height:0;">&nbsp;</td>
          </tr>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0; padding:0; background-color:#EFE9DC; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
  <!-- hidden preview text -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#EFE9DC; font-size:1px; line-height:1px;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EFE9DC;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(14,30,48,0.12);">

          <!-- navy header -->
          <tr>
            <td align="center" style="background-color:#0E1E30; padding:40px 40px 34px 40px;">
              <div style="font-family:Georgia,'Times New Roman',serif; font-size:26px; font-weight:700; letter-spacing:0.5px; color:#F4F0E6;">
                My<span style="color:#E0A43B;">CBCT</span>
              </div>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:3px; color:#8FA3B8; margin-top:8px; text-transform:uppercase;">
                By 360 Visualise
              </div>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td style="padding:44px 48px 8px 48px;">
              ${badgeBlock}
              <h1 style="margin:0 0 16px 0; font-family:Georgia,'Times New Roman',serif; font-size:30px; line-height:1.2; color:#12263C; font-weight:700;">
                ${escapeHtml(heading)}
              </h1>
              <div style="font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#4A5A6B;">
                ${bodyHtml}
              </div>
            </td>
          </tr>
${buttonBlock}
${footnoteBlock}

          <!-- footer band -->
          <tr>
            <td align="center" style="background-color:#F4F0E6; padding:24px 40px;">
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:0.4px; color:#8A97A4;">
                Secure portal &middot; UK-hosted &middot; part of 360 Visualise
              </p>
            </td>
          </tr>

        </table>
        <!-- /card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
