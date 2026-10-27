/**
 * Quotation Controller
 * Handles quotation-related API endpoints.
 *
 * Currently implemented:
 *   POST /api/quotations/send-email  — Send quotation details to client via email
 */

import { sendQuotationEmail } from '../services/quotationEmailService.js';

/**
 * POST /api/quotations/send-email
 *
 * Body:
 *   quotationId       {string}  Internal quotation ID
 *   quotationNumber   {string}  Display quotation number (e.g. QT-2026-0007)
 *   recipientEmail    {string}  Client email address
 *   recipientName     {string}  Client contact person name
 *   organizationName  {string}  Client organisation name
 *   emailSubject      {string}  Email subject line
 *   emailBody         {string}  Admin-authored plain text message
 *   grandTotal        {number}  Quotation grand total (INR)
 *   validUntil        {string}  Quotation validity date
 *   quotationDate     {string}  Quotation issue date
 *
 * Response:
 *   200 { success: true,  messageId: "...", message: "..." }
 *   400 { success: false, message: "Validation error" }
 *   500 { success: false, message: "SMTP error" }
 */
export const sendQuotationEmailHandler = async (req, res) => {
  try {
    const {
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
    } = req.body;

    // ── Input Validation ──────────────────────────────────────────────────────
    if (!quotationNumber || typeof quotationNumber !== 'string' || !quotationNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Quotation number is required.',
      });
    }

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address is required.',
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: `Invalid recipient email address: "${recipientEmail}". Please provide a valid email.`,
      });
    }

    if (grandTotal !== undefined && typeof grandTotal !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'grandTotal must be a number.',
      });
    }

    // ── Send Email ────────────────────────────────────────────────────────────
    const result = await sendQuotationEmail({
      quotationId: quotationId || quotationNumber,
      quotationNumber: quotationNumber.trim(),
      recipientEmail: recipientEmail.trim().toLowerCase(),
      recipientName: (recipientName || '').trim(),
      organizationName: (organizationName || '').trim(),
      emailSubject: (emailSubject || `Quotation ${quotationNumber}`).trim(),
      emailBody: (emailBody || '').trim(),
      grandTotal: typeof grandTotal === 'number' ? grandTotal : 0,
      validUntil: (validUntil || '').trim(),
      quotationDate: (quotationDate || '').trim(),
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Quotation email successfully sent to ${recipientEmail}.`,
        messageId: result.messageId,
      });
    } else {
      // SMTP rejected the message — return 500 but do NOT crash
      return res.status(500).json({
        success: false,
        message: result.error
          ? `Email delivery failed: ${result.error}`
          : 'Email delivery failed. Please check your SMTP configuration.',
      });
    }
  } catch (error) {
    console.error('[QuotationController] Unexpected error in sendQuotationEmailHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected server error occurred while sending the email.',
    });
  }
};
