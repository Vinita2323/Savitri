/**
 * Quotation Email Service
 * Sends quotation details to client via SMTP using nodemailer.
 * SMTP credentials must be configured in environment variables.
 *
 * Required env vars:
 *   SMTP_HOST         - SMTP server hostname (e.g. smtp.gmail.com)
 *   SMTP_PORT         - SMTP port (e.g. 587 for TLS, 465 for SSL)
 *   SMTP_SECURE       - 'true' for SSL (port 465), 'false' for STARTTLS (port 587)
 *   SMTP_USER         - SMTP username / email address
 *   SMTP_PASS         - SMTP password or app password
 *   SMTP_FROM_NAME    - Display name for From address (e.g. "Savitri Enterprise")
 *   SMTP_FROM_EMAIL   - From email address (e.g. quotations@savitri.in)
 */

import nodemailer from 'nodemailer';

/**
 * Create and return a configured nodemailer transporter.
 * Throws an error if required SMTP env vars are missing.
 */
const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP configuration is incomplete. ' +
      'Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.'
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      // Allow self-signed certs in development
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

/**
 * Generate a professional HTML email body for a quotation.
 *
 * @param {Object} params
 * @param {string} params.quotationNumber
 * @param {string} params.recipientName
 * @param {string} params.organizationName
 * @param {string} params.emailBody         - Admin-authored body text
 * @param {string} params.validUntil
 * @param {number} params.grandTotal
 * @param {string} params.quotationDate
 * @returns {string} HTML string
 */
const buildQuotationEmailHtml = ({
  quotationNumber,
  recipientName,
  organizationName,
  emailBody,
  validUntil,
  grandTotal,
  quotationDate,
}) => {
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(grandTotal || 0);

  // Convert plain text body to HTML paragraphs
  const bodyHtml = (emailBody || '')
    .split('\n')
    .map((line) =>
      line.trim() === ''
        ? '<br/>'
        : `<p style="margin:0 0 8px 0;color:#334155;font-size:14px;line-height:1.6;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quotation ${quotationNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#1A2E0A;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:bold;color:#F7941D;letter-spacing:1px;">
                      SAVITRI ENTERPRISE SOLUTIONS
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
                      B2B Institutional Supply &amp; Commercial Procurement Platform
                    </div>
                  </td>
                  <td align="right">
                    <div style="background:#F7941D;color:#1A2E0A;font-size:11px;font-weight:bold;padding:6px 14px;border-radius:6px;letter-spacing:1px;text-transform:uppercase;">
                      Commercial Quotation
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quotation Badge -->
          <tr>
            <td style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Quotation Reference</div>
                    <div style="font-size:18px;font-weight:bold;color:#0f172a;font-family:monospace;margin-top:2px;">${quotationNumber}</div>
                  </td>
                  <td align="right">
                    <div style="font-size:11px;color:#64748b;">Date: ${quotationDate || 'N/A'}</div>
                    <div style="font-size:11px;color:#e11d48;font-weight:bold;margin-top:2px;">Valid Until: ${validUntil || 'N/A'}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Summary Box -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <div style="font-size:10px;font-weight:bold;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Quotation Summary</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px;color:#64748b;">Issued To:</td>
                        <td align="right" style="font-size:13px;font-weight:bold;color:#0f172a;">${organizationName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#64748b;padding-top:8px;">Valid Until:</td>
                        <td align="right" style="font-size:13px;font-weight:bold;color:#e11d48;padding-top:8px;">${validUntil || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top:2px solid #1A2E0A;margin-top:12px;padding-top:12px;padding-bottom:4px;"><div style="border-top:2px solid #1A2E0A;margin-top:8px;"></div></td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;font-weight:bold;color:#0f172a;padding-top:8px;">Grand Total Payable:</td>
                        <td align="right" style="font-size:20px;font-weight:bold;color:#1A2E0A;font-family:monospace;padding-top:8px;">${formattedTotal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1A2E0A;padding:20px 32px;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;">
                This is an official commercial quotation from <strong style="color:#F7941D;">Savitri Enterprise Solutions</strong>.<br/>
                GSTIN: 23AAACS9981K1ZP | Indore Central Fulfillment Complex, Sanwer Road, Indore (MP) - 452015
              </div>
              <div style="font-size:10px;color:#64748b;margin-top:8px;">
                This email was sent by the Savitri Platform. Please do not reply to this address.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Send a quotation email to the specified recipient.
 *
 * @param {Object} params
 * @param {string} params.quotationId        - Internal ID (for logging)
 * @param {string} params.quotationNumber    - Display quotation number
 * @param {string} params.recipientEmail     - Target email address
 * @param {string} params.recipientName      - Contact person name
 * @param {string} params.organizationName   - Buyer organization name
 * @param {string} params.emailSubject       - Email subject line
 * @param {string} params.emailBody          - Plain text body (admin authored)
 * @param {number} params.grandTotal         - Total amount (for summary box)
 * @param {string} params.validUntil         - Validity date
 * @param {string} params.quotationDate      - Issue date
 *
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendQuotationEmail = async ({
  quotationId,
  quotationNumber,
  recipientEmail,
  recipientName,
  organizationName,
  emailSubject,
  emailBody,
  grandTotal,
  validUntil,
  quotationDate,
}) => {
  let transporter;

  try {
    transporter = createTransporter();
  } catch (configError) {
    return { success: false, error: configError.message };
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Savitri Enterprise Solutions';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  const htmlContent = buildQuotationEmailHtml({
    quotationNumber,
    recipientName,
    organizationName,
    emailBody,
    validUntil,
    grandTotal,
    quotationDate,
  });

  // Plain text fallback
  const textContent = emailBody || `Dear ${recipientName},\n\nPlease refer to quotation ${quotationNumber}.\n\nGrand Total: INR ${grandTotal || 0}\nValid Until: ${validUntil || 'N/A'}\n\nBest regards,\n${fromName}`;

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject: emailSubject || `Quotation ${quotationNumber} — ${organizationName}`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[QuotationEmail] Sent ${quotationNumber} to ${recipientEmail} — messageId: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (smtpError) {
    console.error(`[QuotationEmail] Failed to send ${quotationNumber} to ${recipientEmail}:`, smtpError.message);
    return {
      success: false,
      error: smtpError.message,
    };
  }
};
