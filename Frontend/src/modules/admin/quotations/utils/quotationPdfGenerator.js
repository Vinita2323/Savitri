import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format currency in Indian Rupees (INR) for PDF
 * @param {number} val
 * @returns {string} e.g. "Rs. 16,855"
 */
function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return 'Rs. ' + n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

let cachedLogoBase64 = null;

/**
 * Loads and caches LogoSavitri as a base64 Data URL.
 * Checks in-memory cache, loaded DOM img, or fetches /LogoSavitri.png with timeout safety.
 *
 * @returns {Promise<string|null>}
 */
export async function getLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64;

  return new Promise((resolve) => {
    // 1. Check if Logo is already loaded in current DOM
    if (typeof document !== 'undefined') {
      const domImg = document.querySelector('img[src*="LogoSavitri"]');
      if (domImg && domImg.complete && domImg.naturalWidth > 0) {
        try {
          const c = document.createElement('canvas');
          c.width = domImg.naturalWidth;
          c.height = domImg.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(domImg, 0, 0);
          cachedLogoBase64 = c.toDataURL('image/png');
          resolve(cachedLogoBase64);
          return;
        } catch (_) {}
      }
    }

    // 2. Load via Image()
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 500;
          c.height = img.naturalHeight || 500;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          cachedLogoBase64 = c.toDataURL('image/png');
          resolve(cachedLogoBase64);
        } catch (_) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/LogoSavitri.png';

      // 400ms timeout guard to guarantee it never hangs
      setTimeout(() => resolve(null), 400);
      return;
    }

    resolve(null);
  });
}

/**
 * Creates a complete, crisp, vector-based Quotation PDF document.
 * Runs in ~30 milliseconds with zero DOM cloning or canvas hanging.
 *
 * @param {Object} quotation
 * @param {string|null} logoBase64
 * @returns {jsPDF}
 */
export function buildQuotationPdfDocument(quotation, logoBase64 = null) {
  if (!quotation) {
    throw new Error('No quotation data provided to buildQuotationPdfDocument');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let y = 14;

  const buyer = quotation.buyer || {};
  const items = quotation.items || [];
  const summary = quotation.summary || {};
  const terms = quotation.termsAndConditions || {};
  const commercial = quotation.commercialTerms || {};
  const govt = quotation.governmentInfo;

  // 1. Top Header Box & Company Branding
  const logoSize = 18;
  let textX = margin;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, y, logoSize, logoSize);
      textX = margin + logoSize + 4;
    } catch (_) {
      // Fallback mark
      doc.setFillColor(26, 46, 10);
      doc.rect(margin, y, 6, 6, 'F');
      textX = margin + 8;
    }
  } else {
    doc.setFillColor(26, 46, 10);
    doc.rect(margin, y, 6, 6, 'F');
    textX = margin + 8;
  }

  // Company Brand text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(26, 46, 10);
  doc.text('SAVITRI B2B ENTERPRISE', textX, y + 4.5);

  // Badge next to title
  doc.setFillColor(247, 148, 29); // Accent orange #F7941D
  doc.roundedRect(textX + 64, y, 36, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('INSTITUTIONAL SUPPLY', textX + 66, y + 3.5);

  // Commercial Quotation Header Box on Right
  const rightBoxW = 56;
  const rightBoxX = pageWidth - margin - rightBoxW;
  doc.setFillColor(26, 46, 10);
  doc.rect(rightBoxX, y, rightBoxW, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('COMMERCIAL QUOTATION', rightBoxX + 3, y + 4.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Quote No: ' + (quotation.quotationNumber || 'QT-DOC'), rightBoxX + 3, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text('Date of Issue: ' + (quotation.quotationDate || '-'), rightBoxX + 3, y + 14);
  doc.setTextColor(190, 18, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Valid Until: ' + (quotation.validUntil || '-'), rightBoxX + 3, y + 18);

  // Company Details (left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Savitri Multi-Brand E-Commerce & Institutional Supply Platform', textX, y + 9);
  doc.text('Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015', textX, y + 13);
  doc.text('GSTIN: 23AAACS9981K1ZP | CIN: U74999MP2025PTC049102 | FSSAI: 11425850000122', textX, y + 17);

  // Divider line
  y += 21;
  doc.setDrawColor(26, 46, 10);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // 2. Government / Tender Reference Box (if applicable)
  if (govt && (govt.tenderRefNumber || govt.tenderId || govt.procurementPortal)) {
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(3, 105, 161);
    doc.text('GOVERNMENT PROCUREMENT / TENDER SPECIFICATION REFERENCE:', margin + 3, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text('Tender Ref: ' + (govt.tenderRefNumber || 'N/A'), margin + 3, y + 8.5);
    doc.text('Tender/GeM ID: ' + (govt.tenderId || 'N/A'), margin + 60, y + 8.5);
    doc.text('Portal: ' + (govt.procurementPortal || 'Government e-Marketplace (GeM)'), margin + 115, y + 8.5);
    y += 15;
  }

  // 3. Buyer & Destination Details Box
  const boxHeight = 26;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'FD');

  // Left Column: Buyer Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('QUOTATION ISSUED TO (BUYER DETAILS)', margin + 3, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(buyer.contactPerson || buyer.organizationName || 'Client Buyer', margin + 3, y + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(buyer.organizationName || '', margin + 3, y + 12.5);
  const attnText = buyer.designation ? `Attn: ${buyer.phone || ''} (${buyer.designation})` : `Phone: ${buyer.phone || '-'}`;
  doc.text(attnText, margin + 3, y + 16.5);
  doc.text(`Email: ${buyer.email || '-'} | Phone: ${buyer.phone || '-'}`, margin + 3, y + 20.5);

  // Right Column: Destination
  const col2X = margin + 95;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('DELIVERY / FULFILLMENT DESTINATION', col2X, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(buyer.shippingAddress || buyer.billingAddress || commercial.deliveryLocation || 'Indore Fulfillment Hub', col2X, y + 8.5);
  doc.text(`${buyer.city || 'Indore'}, ${buyer.state || 'Madhya Pradesh'} - ${buyer.pincode || '452001'}`, col2X, y + 12.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Timeline: ${commercial.deliveryTimeline || 'Within 7 Working Days'}`, col2X, y + 16.5);

  y += boxHeight + 4;

  // 4. Line Items Table (via autoTable)
  const tableBody = items.map((it, idx) => {
    const desc = it.description ? `\n${it.description}` : (it.sku ? `\nSKU: ${it.sku}` : '');
    const itemText = (it.name || 'Item') + desc;
    return [
      idx + 1,
      itemText,
      it.hsn || '-',
      `${it.quantity} ${it.unit || 'Pcs'}`,
      formatCurrency(it.unitPrice),
      `${it.gstRate || 0}%`,
      formatCurrency(it.taxableAmount),
      formatCurrency(it.lineTotal)
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'ITEM DESCRIPTION', 'HSN', 'QTY', 'UNIT PRICE', 'GST', 'TAXABLE', 'TOTAL']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [26, 46, 10],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 64 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 18, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    }
  });

  let finalY = doc.lastAutoTable.finalY + 4;

  // Check room for terms & totals (need ~45mm)
  if (finalY + 45 > pageHeight - margin) {
    doc.addPage();
    finalY = margin;
  }

  // 5. Commercial Terms (Left) & Financial Breakdown (Right)
  const splitWidth = 88;

  // Left Box: Commercial Terms
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, finalY, splitWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(26, 46, 10);
  doc.text('COMMERCIAL & PAYMENT TERMS', margin + 3, finalY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Payment Terms: ' + (commercial.paymentTerms || 'Net 30 Days from Invoice'), margin + 3, finalY + 9.5);
  doc.text('Delivery Schedule: ' + (commercial.deliveryTimeline || 'Within 7 Working Days'), margin + 3, finalY + 14.5);
  doc.text('Delivery Point: ' + (commercial.deliveryLocation || buyer.shippingAddress || 'Indore Hub'), margin + 3, finalY + 19.5);
  doc.text('Warranty / Shelf Life: ' + (commercial.warrantyTerms || 'Standard 6-month shelf life guarantee'), margin + 3, finalY + 24.5);

  // Right Box: Financial Breakdown
  const rightX = margin + splitWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, finalY, splitWidth, 34, 1.5, 1.5, 'FD');

  let rowY = finalY + 5;
  const labelX = rightX + 4;
  const valX = rightX + splitWidth - 4;

  function drawFinancialRow(label, value, bold = false) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    if (bold) {
      doc.setTextColor(15, 23, 42);
    } else {
      doc.setTextColor(71, 85, 105);
    }
    doc.text(label, labelX, rowY);
    doc.text(value, valX, rowY, { align: 'right' });
    rowY += 4.5;
  }

  drawFinancialRow('Subtotal:', formatCurrency(summary.subtotal));
  drawFinancialRow('Taxable Amount:', formatCurrency(summary.totalTaxable));
  drawFinancialRow('Taxes (CGST/SGST):', formatCurrency(summary.totalGst));
  drawFinancialRow('Shipping & Delivery:', formatCurrency(summary.shippingCharges));

  // Grand Total Highlight Bar
  doc.setFillColor(26, 46, 10);
  doc.roundedRect(rightX + 2, rowY - 1, splitWidth - 4, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(247, 148, 29);
  doc.text('Grand Total:', labelX + 2, rowY + 4.5);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(summary.grandTotal), valX - 2, rowY + 4.5, { align: 'right' });

  finalY += 38;

  // Check room for signatures (need ~25mm)
  if (finalY + 25 > pageHeight - margin) {
    doc.addPage();
    finalY = margin + 10;
  }

  // 6. Signatures
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, finalY + 12, margin + 50, finalY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('BUYER ACCEPTANCE (SEAL & SIGNATURE)', margin, finalY + 16);

  const sigRightX = pageWidth - margin - 55;
  doc.text('FOR SAVITRI ENTERPRISE SOLUTIONS', sigRightX, finalY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Deepak Sharma', sigRightX, finalY + 11);
  doc.line(sigRightX, finalY + 12, pageWidth - margin, finalY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Signatory (Procurement Cell)', sigRightX, finalY + 16);

  // 7. Page numbering on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated electronically by Savitri Multi-Brand Commercial System', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

/**
 * Downloads the quotation PDF instantly to the user's computer.
 * Embeds official LogoSavitri.png in high resolution.
 * Completes in ~30 milliseconds with zero DOM hanging.
 *
 * @param {Object} arg1 - Quotation data object (or element fallback)
 * @param {Object} [arg2] - Quotation data object if arg1 was element
 * @returns {Promise<boolean>}
 */
export async function downloadQuotationPdf(arg1, arg2) {
  try {
    let quotation = arg1;
    if (!quotation || (!quotation.quotationNumber && arg2 && arg2.quotationNumber)) {
      quotation = arg2;
    }
    if (!quotation) {
      console.error('downloadQuotationPdf: No quotation data provided');
      return false;
    }

    const safeNumber = (quotation.quotationNumber || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Quotation_${safeNumber}.pdf`;

    // 1. Fetch or get cached logo
    const logoBase64 = await getLogoBase64();

    // 2. Build vector PDF with official logo
    const doc = buildQuotationPdfDocument(quotation, logoBase64);

    // 3. Direct instant download
    doc.save(filename);

    // 4. Open in new tab for preview with download button
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (_) {}

    return true;
  } catch (error) {
    console.error('downloadQuotationPdf error:', error);
    return false;
  }
}

/**
 * Prints the quotation document cleanly in an isolated iframe.
 * Only called when user explicitly clicks the "Print" button.
 *
 * @param {HTMLElement} element - The DOM element containing the quotation document
 * @param {string} title - Document title for the print job
 */
export function printQuotationDocument(element, title = 'Quotation') {
  if (!element) {
    console.error('printQuotationDocument: No element provided');
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Could not access iframe document');
    window.print();
    return;
  }

  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${headStyles}
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            overflow: visible !important;
            height: auto !important;
          }
          .no-print, button {
            display: none !important;
          }
          .quotation-printable-document {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group; 
          }
        </style>
      </head>
      <body>
        <div class="quotation-printable-document">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Iframe print failed:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 400);
}



