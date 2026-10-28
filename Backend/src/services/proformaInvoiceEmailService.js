/**
 * Proforma Invoice Email Service
 * Handles sending official Proforma Invoices with attached PDF via SMTP.
 */

import nodemailer from 'nodemailer';

/**
 * Configure and return nodemailer transporter.
 */
const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP configuration is incomplete. ' +
      'Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment (.env).'
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
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

/**
 * Build professional HTML email template for Proforma Invoices
 */
const buildProformaInvoiceEmailHtml = ({
  proformaNumber,
  recipientName,
  companyName,
  emailBody,
  issueDate,
  validUntil,
  grandTotal,
  advanceRequired,
  balanceDue,
  bankDetails,
}) => {
  const formatINR = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);

  const customMessage = (emailBody || '')
    .split('\n')
    .map((line) =>
      line.trim() === ''
        ? '<br/>'
        : `<p style="margin:0 0 10px 0;color:#334155;font-size:14px;line-height:1.6;">${line
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')}</p>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proforma Invoice ${proformaNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.07);">
          
          <!-- Top Header -->
          <tr>
            <td style="background-color:#1A2E0A;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:22px;font-weight:bold;color:#F7941D;letter-spacing:0.5px;">
                      SAVITRI B2B ENTERPRISE
                    </div>
                    <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">
                      Commercial Procurement &amp; Institutional Supply Desk
                    </div>
                  </td>
                  <td align="right">
                    <span style="background-color:#F7941D;color:#1A2E0A;font-size:11px;font-weight:bold;padding:6px 14px;border-radius:6px;letter-spacing:1px;text-transform:uppercase;display:inline-block;">
                      Proforma Invoice
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Document Reference Bar -->
          <tr>
            <td style="background-color:#f8fafc;border-bottom:1px solid #e2e8f0;padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Proforma Invoice Number</div>
                    <div style="font-size:18px;font-weight:bold;color:#0f172a;font-family:monospace;margin-top:2px;">${proformaNumber}</div>
                  </td>
                  <td align="right">
                    <div style="font-size:12px;color:#64748b;">Issued: <strong>${issueDate || 'N/A'}</strong></div>
                    <div style="font-size:12px;color:#e11d48;font-weight:bold;margin-top:3px;">Valid Until: ${validUntil || 'N/A'}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <p style="margin:0 0 14px 0;font-size:14px;color:#0f172a;">
                Dear <strong>${recipientName || companyName}</strong>,
              </p>
              
              <div style="font-size:14px;color:#334155;line-height:1.6;">
                ${customMessage || `<p style="margin:0 0 12px 0;">Please find attached the official <strong>Proforma Invoice #${proformaNumber}</strong> containing the agreed commercial terms, line item specifications, and preliminary demand details for your corporate procurement.</p><p style="margin:0 0 12px 0;">Kindly review the attached PDF document and arrange the advance payment to confirm the allocation of inventory and initiate dispatch.</p>`}
              </div>
            </td>
          </tr>

          <!-- Financial Summary Box -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="padding:14px 20px;background-color:#f1f5f9;border-bottom:1px solid #e2e8f0;">
                    <div style="font-size:11px;font-weight:bold;color:#475569;text-transform:uppercase;letter-spacing:1px;">
                      Transaction &amp; Remittance Summary
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Billed To:</td>
                  <td align="right" style="padding:14px 20px;font-size:13px;font-weight:bold;color:#0f172a;border-bottom:1px solid #f1f5f9;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 20px;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Grand Total (Gross Payable):</td>
                  <td align="right" style="padding:10px 20px;font-size:14px;font-weight:bold;color:#0f172a;border-bottom:1px solid #f1f5f9;">${formatINR(grandTotal)}</td>
                </tr>
                <tr style="background-color:#ecfdf5;">
                  <td style="padding:12px 20px;font-size:14px;font-weight:bold;color:#065f46;">Advance Amount Required:</td>
                  <td align="right" style="padding:12px 20px;font-size:16px;font-weight:bold;color:#047857;font-family:monospace;">${formatINR(advanceRequired)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 20px;font-size:13px;color:#64748b;">Remaining Balance (Prior to Dispatch):</td>
                  <td align="right" style="padding:10px 20px;font-size:13px;font-weight:bold;color:#64748b;">${formatINR(balanceDue)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Remittance Bank Details -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px dashed #86efac;border-radius:10px;padding:16px;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:bold;color:#166534;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">
                      Bank Account Details for Wire Remittance (NEFT / RTGS / IMPS)
                    </div>
                    <div style="font-size:12px;color:#1f2937;line-height:1.6;">
                      <strong>Bank:</strong> ${bankDetails?.bankName || 'HDFC Bank Ltd.'}<br/>
                      <strong>Account Name:</strong> ${bankDetails?.accountName || 'Savitri Enterprise B2B Solutions'}<br/>
                      <strong>Account Number:</strong> <span style="font-family:monospace;font-weight:bold;">${bankDetails?.accountNumber || '50200088921473'}</span><br/>
                      <strong>IFSC Code:</strong> <span style="font-family:monospace;font-weight:bold;">${bankDetails?.ifscCode || 'HDFC0001248'}</span><br/>
                      <strong>Branch:</strong> ${bankDetails?.branch || 'Sanwer Road Industrial Area, Indore'}<br/>
                      <strong>UPI ID:</strong> <span style="font-family:monospace;">${bankDetails?.upiId || 'savitrient@hdfcbank'}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Statutory Notice -->
          <tr>
            <td style="padding:0 32px 24px;">
              <div style="background-color:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:12px 16px;font-size:11px;color:#92400e;line-height:1.5;">
                <strong>Commercial Notice:</strong> This document is a preliminary commercial Proforma Invoice. It does not constitute a Tax Invoice under Section 31 of the CGST Act, 2017. An official Tax Invoice will be issued at the time of delivery/dispatch of goods.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#1A2E0A;padding:20px 32px;text-align:center;">
              <div style="font-size:11px;color:#94a3b8;line-height:1.6;">
                <strong style="color:#F7941D;">Savitri Enterprise Solutions</strong> &bull; Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015<br/>
                GSTIN: 23AAACS9981K1ZP | CIN: U74999MP2025PTC049102 | Support: +91 731 498 7720
              </div>
              <div style="font-size:10px;color:#64748b;margin-top:10px;">
                This communication was securely dispatched by Savitri Enterprise Platform.
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
 * Send Proforma Invoice via email with attached PDF.
 *
 * @param {Object} params
 * @param {string} params.proformaNumber
 * @param {string} params.recipientEmail
 * @param {string} params.recipientName
 * @param {string} params.companyName
 * @param {string} params.emailSubject
 * @param {string} params.emailBody
 * @param {number} params.grandTotal
 * @param {number} params.advanceRequired
 * @param {number} params.balanceDue
 * @param {string} params.issueDate
 * @param {string} params.validUntil
 * @param {Object} params.bankDetails
 * @param {string|Buffer} [params.pdfAttachmentBase64] Optional base64 or Buffer of PDF document
 * @param {string} [params.pdfFileName]
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export const sendProformaInvoiceEmail = async ({
  proformaNumber,
  recipientEmail,
  recipientName,
  companyName,
  emailSubject,
  emailBody,
  grandTotal,
  advanceRequired,
  balanceDue,
  issueDate,
  validUntil,
  bankDetails,
  pdfAttachmentBase64,
  pdfFileName,
}) => {
  let transporter;

  try {
    transporter = createTransporter();
  } catch (configError) {
    return {
      success: false,
      error: configError.message,
    };
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Savitri Enterprise Solutions';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  const htmlContent = buildProformaInvoiceEmailHtml({
    proformaNumber,
    recipientName,
    companyName,
    emailBody,
    issueDate,
    validUntil,
    grandTotal,
    advanceRequired,
    balanceDue,
    bankDetails,
  });

  const subject = emailSubject || `Proforma Invoice #${proformaNumber} — ${companyName}`;
  const textContent = emailBody || `Dear ${recipientName || companyName},\n\nPlease refer to attached Proforma Invoice #${proformaNumber}.\nGrand Total: INR ${grandTotal}\nAdvance Required: INR ${advanceRequired}\nValid Until: ${validUntil}\n\nBest regards,\n${fromName}`;

  // Build attachments array
  const attachments = [];
  if (pdfAttachmentBase64) {
    // If base64 data URI format, strip header
    const cleanBase64 = typeof pdfAttachmentBase64 === 'string' && pdfAttachmentBase64.includes('base64,')
      ? pdfAttachmentBase64.split('base64,')[1]
      : pdfAttachmentBase64;

    attachments.push({
      filename: pdfFileName || `Proforma_Invoice_${proformaNumber}.pdf`,
      content: cleanBase64,
      encoding: 'base64',
      contentType: 'application/pdf',
    });
  }

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
      attachments,
    });

    console.log(`[ProformaEmail] Successfully sent ${proformaNumber} to ${recipientEmail} (messageId: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (smtpError) {
    console.error(`[ProformaEmail] Delivery failed for ${proformaNumber} to ${recipientEmail}:`, smtpError.message);
    return {
      success: false,
      error: smtpError.message,
    };
  }
};
