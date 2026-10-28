import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, numberToWordsINR } from './proformaCalculations';

let cachedLogoBase64 = null;

/**
 * Loads and caches LogoSavitri as a base64 Data URL.
 */
export async function getLogoBase64() {
  if (cachedLogoBase64) return cachedLogoBase64;

  return new Promise((resolve) => {
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
      setTimeout(() => resolve(null), 400);
      return;
    }

    resolve(null);
  });
}

function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return 'Rs. ' + n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

/**
 * Builds the complete vector-based Proforma Invoice PDF document.
 *
 * @param {Object} proforma
 * @param {string|null} logoBase64
 * @returns {jsPDF}
 */
export function buildProformaPdfDocument(proforma, logoBase64 = null) {
  if (!proforma) {
    throw new Error('No proforma invoice data provided to buildProformaPdfDocument');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  let y = 12;

  const client = proforma.clientSnapshot || {};
  const billing = client.billingAddress || {};
  const shipping = client.shippingAddress || {};
  const issuing = proforma.issuingCompany || {
    name: 'SAVITRI B2B ENTERPRISE',
    legalName: 'Savitri Multi-Brand E-Commerce & Institutional Supply Platform',
    address: 'Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015',
    phone: '+91 731 498 7720',
    email: 'billing@savitri.com',
    gstin: '23AAACS9981K1ZP',
    pan: 'AAACS9981K',
    cin: 'U74999MP2025PTC049102',
    bankDetails: {
      bankName: 'HDFC Bank Ltd.',
      accountName: 'Savitri Enterprise B2B Solutions',
      accountNumber: '50200088921473',
      ifscCode: 'HDFC0001248',
      branch: 'Sanwer Road Industrial Area, Indore',
      upiId: 'savitrient@hdfcbank',
    },
  };
  const bank = issuing.bankDetails || {};
  const items = proforma.items || [];
  const summary = proforma.summary || {};

  // ==========================================
  // 1. TOP HEADER & BRANDING
  // ==========================================
  const logoSize = 16;
  let textX = margin;

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, y, logoSize, logoSize);
      textX = margin + logoSize + 4;
    } catch (_) {
      doc.setFillColor(26, 46, 10);
      doc.rect(margin, y, 6, 6, 'F');
      textX = margin + 8;
    }
  } else {
    doc.setFillColor(26, 46, 10);
    doc.rect(margin, y, 6, 6, 'F');
    textX = margin + 8;
  }

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(26, 46, 10);
  doc.text(issuing.name || 'SAVITRI B2B ENTERPRISE', textX, y + 4.5);

  // Document Badge
  doc.setFillColor(247, 148, 29); // Savitri Orange
  doc.roundedRect(pageWidth - margin - 48, y, 48, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 46, 10);
  doc.text('PROFORMA INVOICE', pageWidth - margin - 45, y + 4.2);

  // Statutory Non-Tax Invoice Watermark Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${issuing.legalName || 'Institutional Procurement Desk'} | GSTIN: ${issuing.gstin} | CIN: ${issuing.cin || 'U74999MP2025PTC049102'}`,
    textX,
    y + 9
  );
  doc.text(
    `${issuing.address} | Support: ${issuing.phone} | ${issuing.email}`,
    textX,
    y + 13
  );

  // Top separator line
  y += 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // ==========================================
  // 2. DOCUMENT METADATA BAR
  // ==========================================
  y += 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 14, 'S');

  // Col 1: Proforma Number & Status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PROFORMA INVOICE NO.', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(proforma.proformaNumber || 'PI-2026-0001', margin + 3, y + 10);

  // Col 2: Issue Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUE DATE', margin + 55, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(proforma.issueDate), margin + 55, y + 9.5);

  // Col 3: Validity Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(225, 29, 72); // Accent red
  doc.text('VALID UNTIL', margin + 95, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(225, 29, 72);
  doc.text(formatDate(proforma.validUntil), margin + 95, y + 9.5);

  // Col 4: Linked Quotation / Order
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('REFERENCE QUOTATION / ORDER', margin + 135, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const refText =
    proforma.referenceQuotation?.quotationNumber ||
    proforma.referenceOrder?.orderNumber ||
    'Direct Corporate Inquiry';
  doc.text(refText, margin + 135, y + 9.5);

  y += 18;

  // ==========================================
  // 3. BUYER & CONSIGNEE DETAILS
  // ==========================================
  const colW = (contentWidth - 4) / 2;

  // Box A: Billed To
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, colW, 28, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, colW, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 46, 10);
  doc.text('BILLED TO (BUYER DETAILS)', margin + 3, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(client.companyName || 'Corporate Client', margin + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  const contactStr = client.contactPerson ? `Attn: ${client.contactPerson} | Ph: ${client.phone || '-'}` : `Ph: ${client.phone || '-'}`;
  doc.text(contactStr, margin + 3, y + 13);
  doc.text(`Email: ${client.email || '-'}`, margin + 3, y + 16.5);

  const billAddr1 = [billing.addressLine1, billing.addressLine2, billing.landmark].filter(Boolean).join(', ');
  const billAddr2 = [billing.city, billing.state, billing.pincode].filter(Boolean).join(' - ');
  doc.text(billAddr1 ? billAddr1.substring(0, 52) : 'Premises Address', margin + 3, y + 20);
  doc.text(billAddr2 || 'Madhya Pradesh, India', margin + 3, y + 23.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${client.gstin || 'Unregistered / Consumer'}`, margin + 3, y + 27);

  // Box B: Shipped To / Consignee
  const col2X = margin + colW + 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(col2X, y, colW, 28, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(col2X, y, colW, 28, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 46, 10);
  doc.text('SHIPPED TO (DELIVERY SITE / CONSIGNEE)', col2X + 3, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(shipping.fullName || client.companyName || 'Consignee Site', col2X + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Site Contact: ${shipping.phone || client.phone || '-'}`, col2X + 3, y + 13);
  const shipAddr1 = [shipping.addressLine1, shipping.addressLine2, shipping.landmark].filter(Boolean).join(', ');
  const shipAddr2 = [shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(' - ');
  doc.text(shipAddr1 ? shipAddr1.substring(0, 52) : (billAddr1 ? billAddr1.substring(0, 52) : 'Delivery Site Address'), col2X + 3, y + 17);
  doc.text(shipAddr2 || billAddr2 || 'Madhya Pradesh, India', col2X + 3, y + 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Place of Supply: ${billing.state || 'Madhya Pradesh'} (State Code: 23)`, col2X + 3, y + 24.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Delivery Mode: ${proforma.deliveryTerms ? proforma.deliveryTerms.substring(0, 40) : 'Road Transport'}`, col2X + 3, y + 27.5);

  y += 32;

  // ==========================================
  // 4. ITEMS TABLE (AutoTable)
  // ==========================================
  const tableData = items.map((it, idx) => {
    return [
      idx + 1,
      `${it.name}${it.description ? '\n' + it.description : ''}`,
      it.hsn || '-',
      `${it.quantity} ${it.unit || 'Units'}`,
      formatCurrency(it.unitPrice),
      it.discountAmount > 0 ? formatCurrency(it.discountAmount) : '-',
      formatCurrency(it.taxableAmount),
      `${it.gstRate}%`,
      formatCurrency(it.taxAmount),
      formatCurrency(it.lineTotal),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        '#',
        'Item Description / Specification',
        'HSN',
        'Qty',
        'Unit Price',
        'Disc.',
        'Taxable',
        'GST',
        'Tax Amt',
        'Total',
      ],
    ],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [26, 46, 10], // Savitri Forest Green
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'left', cellWidth: 54 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 17 },
      5: { halign: 'right', cellWidth: 14 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 11 },
      8: { halign: 'right', cellWidth: 16 },
      9: { halign: 'right', cellWidth: 17 },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 3;

  // Check if we need to add a page for footer & summary
  if (y > pageHeight - 75) {
    doc.addPage();
    y = margin;
  }

  // ==========================================
  // 5. COMMERCIAL SUMMARY & BANK REMITTANCE
  // ==========================================
  const summaryBoxW = 78;
  const termsBoxW = contentWidth - summaryBoxW - 4;

  // Left Side: Bank Remittance Details & Amount In Words
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, termsBoxW, 46, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, termsBoxW, 46, 'S');

  // Amount in words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(26, 46, 10);
  doc.text('TOTAL AMOUNT IN WORDS:', margin + 3, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  const words = numberToWordsINR(summary.grandTotal || 0);
  doc.text(words, margin + 3, y + 8.5);

  // Bank wire remittance
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 2, y + 11.5, margin + termsBoxW - 2, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(26, 46, 10);
  doc.text('WIRE PAYMENT / NEFT / RTGS REMITTANCE DETAILS:', margin + 3, y + 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank Name: ${bank.bankName || 'HDFC Bank Ltd.'}`, margin + 3, y + 19.5);
  doc.text(`Account Name: ${bank.accountName || 'Savitri Enterprise B2B Solutions'}`, margin + 3, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account No: ${bank.accountNumber || '50200088921473'}`, margin + 3, y + 27);
  doc.text(`IFSC Code: ${bank.ifscCode || 'HDFC0001248'}`, margin + 3, y + 31);
  doc.setFont('helvetica', 'normal');
  doc.text(`Branch: ${bank.branch || 'Sanwer Road Industrial Area, Indore'}`, margin + 3, y + 35);
  doc.text(`UPI Virtual ID: ${bank.upiId || 'savitrient@hdfcbank'}`, margin + 3, y + 39);

  // Statutory reminder inside box
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text('* Remit advance payment quoting the Proforma Invoice Number.', margin + 3, y + 43.5);

  // Right Side: Financial Breakdown
  const sumX = margin + termsBoxW + 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(sumX, y, summaryBoxW, 46, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(sumX, y, summaryBoxW, 46, 'S');

  let rowY = y + 4.5;
  const drawSummaryRow = (label, val, isBold = false, textColor = [15, 23, 42]) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(label, sumX + 3, rowY);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(formatCurrency(val), sumX + summaryBoxW - 3, rowY, { align: 'right' });
    rowY += 4.2;
  };

  drawSummaryRow('Subtotal (Gross):', summary.subtotal || 0);
  if (summary.totalDiscount > 0) {
    drawSummaryRow('Total Discounts:', -summary.totalDiscount, false, [225, 29, 72]);
  }
  drawSummaryRow('Taxable Amount:', summary.taxableAmount || 0);

  if (summary.cgstAmount > 0 || summary.sgstAmount > 0) {
    drawSummaryRow('CGST (Central GST):', summary.cgstAmount || 0);
    drawSummaryRow('SGST (State GST):', summary.sgstAmount || 0);
  } else if (summary.igstAmount > 0) {
    drawSummaryRow('IGST (Integrated GST):', summary.igstAmount || 0);
  }

  if (summary.shippingCharges > 0) {
    drawSummaryRow('Freight & Delivery:', summary.shippingCharges || 0);
  }
  if (summary.additionalCharges > 0) {
    drawSummaryRow('Additional Handling:', summary.additionalCharges || 0);
  }

  // Grand Total highlight bar
  rowY += 1;
  doc.setFillColor(26, 46, 10);
  doc.rect(sumX, rowY - 3.2, summaryBoxW, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(247, 148, 29); // Accent orange
  doc.text('GRAND TOTAL:', sumX + 3, rowY + 1);
  doc.text(formatCurrency(summary.grandTotal || 0), sumX + summaryBoxW - 3, rowY + 1, { align: 'right' });

  // Advance Required Row
  rowY += 6;
  doc.setFillColor(236, 253, 245);
  doc.rect(sumX, rowY - 2.5, summaryBoxW, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text(`Advance Required (${summary.advancePercentage || 50}%):`, sumX + 3, rowY + 1.2);
  doc.text(formatCurrency(summary.advanceAmount || 0), sumX + summaryBoxW - 3, rowY + 1.2, { align: 'right' });

  // Balance Due Row
  rowY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Balance Prior to Dispatch:', sumX + 3, rowY + 1.2);
  doc.text(formatCurrency(summary.balanceDue || 0), sumX + summaryBoxW - 3, rowY + 1.2, { align: 'right' });

  y += 49;

  // ==========================================
  // 6. TERMS, NOTES & SIGNATORY
  // ==========================================
  const sigW = 60;
  const termsW = contentWidth - sigW - 4;

  // Terms and Conditions Box
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, termsW, 26, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(26, 46, 10);
  doc.text('TERMS & CONDITIONS & COMMERCIAL STIPULATIONS:', margin + 2.5, y + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  const termsText =
    proforma.termsAndConditions ||
    '1. This is a Proforma Invoice and represents a commercial quotation / preliminary demand note. It is NOT a tax invoice under Section 31 of CGST Act, 2017.\n2. Goods allocation and dispatch will be initiated strictly upon receipt of advance payment.\n3. Quoted prices and tax rates are firm until the validity date indicated above.\n4. Official GST Tax Invoice will be issued upon dispatch of goods.\n5. Jurisdiction: Subject to Indore (MP) courts only.';

  const splitTerms = doc.splitTextToSize(termsText, termsW - 5);
  doc.text(splitTerms, margin + 2.5, y + 7.5);

  // Signatory Box
  const sigX = margin + termsW + 4;
  doc.setFillColor(248, 250, 252);
  doc.rect(sigX, y, sigW, 26, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(sigX, y, sigW, 26, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(26, 46, 10);
  doc.text('FOR SAVITRI B2B ENTERPRISE', sigX + 2.5, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Commercial Procurement Desk', sigX + 2.5, y + 8.5);
  doc.text(`Prepared By: ${proforma.createdBy?.name || 'Super Admin'}`, sigX + 2.5, y + 12.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', sigX + sigW - 28, y + 23);

  // ==========================================
  // 7. FOOTER BAR
  // ==========================================
  const footerY = pageHeight - 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Proforma Invoice #${proforma.proformaNumber || '-'} | Generated on ${new Date().toLocaleString('en-IN')} | System-generated commercial document`,
    margin,
    footerY
  );
  doc.text('Page 1 of 1', pageWidth - margin - 14, footerY);

  return doc;
}

/**
 * Downloads Proforma Invoice PDF directly.
 * Does NOT invoke window.print().
 *
 * @param {Object} proforma
 */
export async function downloadProformaPdf(proforma) {
  try {
    const logoBase64 = await getLogoBase64();
    const doc = buildProformaPdfDocument(proforma, logoBase64);
    const fileName = `Proforma_Invoice_${(proforma.proformaNumber || 'DOC').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error('Failed to download Proforma Invoice PDF:', error);
    throw error;
  }
}

/**
 * Prints Proforma Invoice PDF via invisible iframe (crisp vector print).
 *
 * @param {Object} proforma
 */
export async function printProformaPdf(proforma) {
  try {
    const logoBase64 = await getLogoBase64();
    const doc = buildProformaPdfDocument(proforma, logoBase64);
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (_) {}
      }, 250);
    };

    setTimeout(() => {
      try {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 60000);

    return true;
  } catch (error) {
    console.error('Failed to print Proforma Invoice PDF:', error);
    throw error;
  }
}

/**
 * Returns Proforma Invoice PDF as base64 string for email attachment.
 *
 * @param {Object} proforma
 * @returns {Promise<string>}
 */
export async function getProformaPdfBase64(proforma) {
  try {
    const logoBase64 = await getLogoBase64();
    const doc = buildProformaPdfDocument(proforma, logoBase64);
    return doc.output('datauristring');
  } catch (error) {
    console.error('Failed to generate Proforma Invoice PDF base64:', error);
    throw error;
  }
}
