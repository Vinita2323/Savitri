import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

let cachedLogoBase64 = null;

/**
 * Loads and caches LogoSavitri as a base64 Data URL.
 * Checks in-memory cache, loaded DOM img, or fetches /LogoSavitri.png.
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

/**
 * Format a Date object or string to Indian standard DD-MM-YYYY format
 */
export function formatDate(val) {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (_) {
    return String(val);
  }
}

/**
 * Builds a vector-based Delivery Challan PDF document
 * @param {Object} challan
 * @param {string|null} logoBase64
 * @returns {jsPDF}
 */
export function buildDeliveryChallanPdfDocument(challan, logoBase64 = null) {
  if (!challan) {
    throw new Error('No delivery challan data provided');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let y = 14;

  const client = challan.clientSnapshot || {};
  const billing = client.billingAddress || {};
  const shipping = client.shippingAddress || {};
  const transport = challan.transportDetails || {};
  const issuing = challan.issuingCompany || {
    name: 'SAVITRI B2B ENTERPRISE',
    legalName: 'Savitri Multi-Brand E-Commerce & Institutional Supply Platform',
    address: 'Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015',
    phone: '+91 731 498 7720',
    email: 'dispatch@savitri.com',
    gstin: '23AAACS9981K1ZP',
    cin: 'U74999MP2025PTC049102',
    fssai: '11425850000122',
  };
  const items = challan.items || [];

  // ==========================================
  // 1. HEADER & ISSUING COMPANY BRANDING
  // ==========================================
  const logoSize = 18;
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

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(26, 46, 10);
  doc.text(issuing.name || 'SAVITRI B2B ENTERPRISE', textX, y + 4.5);

  // Document Badge on Right
  const rightBoxW = 62;
  const rightBoxX = pageWidth - margin - rightBoxW;

  doc.setFillColor(26, 46, 10); // Brand Dark Green #1A2E0A
  doc.rect(rightBoxX, y, rightBoxW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DELIVERY CHALLAN', rightBoxX + 6, y + 4.5);

  // Subtitle under title badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Challan No: ${challan.challanNumber || 'DC-PENDING'}`, rightBoxX + 3, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.text(`Challan Date: ${formatDate(challan.challanDate)}`, rightBoxX + 3, y + 15.5);
  doc.text(`Dispatch Date: ${formatDate(challan.dispatchDate || challan.challanDate)}`, rightBoxX + 3, y + 19.5);

  // Status Badge
  const statusColors = {
    Dispatched: [22, 101, 52],
    'Partially Delivered': [180, 83, 9],
    Delivered: [15, 118, 110],
    Draft: [100, 116, 139],
    Cancelled: [185, 28, 28],
  };
  const [sr, sg, sb] = statusColors[challan.status] || [30, 41, 59];
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(sr, sg, sb);
  doc.text(`Status: ${challan.status || 'Draft'}`, rightBoxX + 3, y + 23.5);

  // Left Company Subtext
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(issuing.legalName || 'Savitri Multi-Brand E-Commerce & Institutional Supply Platform', textX, y + 9);
  doc.text(issuing.address || 'Indore Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015', textX, y + 13);
  doc.text(`GSTIN: ${issuing.gstin} | CIN: ${issuing.cin} | Phone: ${issuing.phone}`, textX, y + 17);
  doc.text(`Issued under Rule 55 of CGST Rules, 2017 (Transportation of goods without tax invoice)`, textX, y + 21);

  y += 27;

  // Thin separator rule
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // ==========================================
  // 2. CLIENT & ADDRESS INFO (BILL TO / SHIP TO)
  // ==========================================
  const colW = (contentWidth - 6) / 3;

  // Box A: Bill To / Client
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, colW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, colW, 30, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 46, 10);
  doc.text('CONSIGNEE / CLIENT DETAILS', margin + 3, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(client.companyName || client.name || 'Valued Client', margin + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact: ${client.name || '-'}`, margin + 3, y + 13);
  doc.text(`Phone: ${client.phone || '-'}`, margin + 3, y + 16.5);
  doc.text(`Email: ${client.email || '-'}`, margin + 3, y + 20);
  if (client.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GSTIN: ${client.gstin}`, margin + 3, y + 24);
  } else {
    doc.text(`GSTIN: Consumer / Unregistered`, margin + 3, y + 24);
  }

  // Box B: Ship To Address
  const shipX = margin + colW + 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(shipX, y, colW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(shipX, y, colW, 30, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 46, 10);
  doc.text('DISPATCH / DELIVERY DESTINATION', shipX + 3, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(shipping.fullName || client.name || 'Delivery Recipient', shipX + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const street1 = [shipping.addressLine1, shipping.addressLine2].filter(Boolean).join(', ');
  const locality = [shipping.landmark, shipping.city].filter(Boolean).join(', ');
  const statePin = [shipping.state, shipping.pincode].filter(Boolean).join(' - ');

  doc.text(street1 ? street1.substring(0, 36) : 'Indore Area Delivery', shipX + 3, y + 13);
  doc.text(locality ? locality.substring(0, 36) : 'Indore (MP)', shipX + 3, y + 16.5);
  doc.text(statePin ? statePin.substring(0, 36) : 'Madhya Pradesh', shipX + 3, y + 20);
  doc.text(`Contact: ${shipping.phone || client.phone || '-'}`, shipX + 3, y + 24);

  // Box C: Linked Order & Transport Meta
  const metaX = shipX + colW + 3;
  doc.setFillColor(248, 250, 252);
  doc.rect(metaX, y, colW, 30, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(metaX, y, colW, 30, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 46, 10);
  doc.text('LINKED ORDER & DISPATCH PURPOSE', metaX + 3, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Order No: ${challan.orderNumber || '-'}`, metaX + 3, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Order Date: ${formatDate(challan.orderDate)}`, metaX + 3, y + 13);
  doc.text(`Purpose: ${challan.purpose || 'Supply on Sale'}`, metaX + 3, y + 16.5);
  doc.text(`Vehicle No: ${transport.vehicleNumber || 'Local Fleet / Hand Delivery'}`, metaX + 3, y + 20);
  doc.text(`LR / Docket: ${transport.lrNumber || 'Direct Transfer'}`, metaX + 3, y + 24);

  y += 33;

  // ==========================================
  // 3. TRANSPORT DETAILS STRIP
  // ==========================================
  doc.setFillColor(239, 246, 238); // Pale mint tint
  doc.rect(margin, y, contentWidth, 8.5, 'F');
  doc.setDrawColor(187, 219, 185);
  doc.rect(margin, y, contentWidth, 8.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(26, 46, 10);

  const tColW = contentWidth / 4;
  doc.text(`Transporter: ${transport.transporterName || 'Self / In-house Logistics'}`, margin + 2, y + 5.5);
  doc.text(`Vehicle: ${transport.vehicleNumber || '-'}`, margin + tColW + 2, y + 5.5);
  doc.text(`LR No: ${transport.lrNumber || '-'}`, margin + tColW * 2 + 2, y + 5.5);
  doc.text(`E-Way Bill: ${transport.ewayBillNumber || 'Not Applicable (Under Threshold)'}`, margin + tColW * 3 + 2, y + 5.5);

  y += 11;

  // ==========================================
  // 4. PRODUCT ITEMS TABLE (jspdf-autotable)
  // ==========================================
  const tableHeaders = [
    [
      { content: '#', styles: { halign: 'center', cellWidth: 10 } },
      { content: 'Product Description & Specifications', styles: { halign: 'left' } },
      { content: 'HSN / SAC', styles: { halign: 'center', cellWidth: 22 } },
      { content: 'Unit', styles: { halign: 'center', cellWidth: 18 } },
      { content: 'Ordered Qty', styles: { halign: 'center', cellWidth: 24 } },
      { content: 'Prev. Dispatched', styles: { halign: 'center', cellWidth: 26 } },
      { content: 'Dispatched Qty', styles: { halign: 'center', cellWidth: 26 } },
    ],
  ];

  let totalDispatched = 0;
  let totalOrdered = 0;

  const tableBody = items.map((item, idx) => {
    const oQty = Number(item.orderedQuantity) || 0;
    const pQty = Number(item.previouslyDispatchedQuantity) || 0;
    const dQty = Number(item.dispatchedQuantity) || 0;

    totalOrdered += oQty;
    totalDispatched += dQty;

    const descLines = [item.name];
    if (item.variantTitle) descLines.push(`Variant: ${item.variantTitle}`);
    if (item.sku) descLines.push(`SKU: ${item.sku}`);
    if (item.notes) descLines.push(`Note: ${item.notes}`);

    return [
      { content: String(idx + 1), styles: { halign: 'center' } },
      { content: descLines.join('\n'), styles: { halign: 'left' } },
      { content: item.hsn || '-', styles: { halign: 'center' } },
      { content: item.unit || 'Units', styles: { halign: 'center' } },
      { content: String(oQty), styles: { halign: 'center' } },
      { content: String(pQty), styles: { halign: 'center' } },
      { content: String(dQty), styles: { halign: 'center', fontStyle: 'bold' } },
    ];
  });

  // Summary Row
  tableBody.push([
    {
      content: 'TOTAL DISPATCHED SUMMARY',
      colSpan: 4,
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    {
      content: String(totalOrdered),
      styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] },
    },
    {
      content: '-',
      styles: { halign: 'center', fillColor: [241, 245, 249] },
    },
    {
      content: String(totalDispatched),
      styles: { halign: 'center', fontStyle: 'bold', textColor: [26, 46, 10], fillColor: [254, 243, 199] },
    },
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [26, 46, 10], // Brand dark green
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    didDrawPage: (data) => {
      y = data.cursor.y;
    },
  });

  y = doc.lastAutoTable.finalY + 4;

  // Check page overflow safety
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 15;
  }

  // ==========================================
  // 5. NOTES & TERMS SECTION
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(26, 46, 10);
  doc.text('TERMS & STATUTORY DECLARATION:', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const termsText =
    challan.termsAndConditions ||
    '1. This delivery challan is issued under Rule 55 of CGST Rules, 2017 for goods transportation without tax invoice.\n' +
    '2. Goods mentioned above have been verified by issuing authority and handed over for safe delivery.\n' +
    '3. Please inspect physical packaging and acknowledge receipt on duplicate copy with receiver signature & stamp.';
  doc.text(termsText, margin, y + 3.8);

  y += 18;

  // ==========================================
  // 6. DUAL SIGNATURE BOXES (CONSIGNOR & CONSIGNEE)
  // ==========================================
  const sigBoxW = (contentWidth - 8) / 2;

  // Consignee (Receiver) Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, y, sigBoxW, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text("RECEIVER'S ACKNOWLEDGEMENT", margin + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Received the above goods in sound condition:', margin + 3, y + 9);
  doc.text('Receiver Name: __________________________', margin + 3, y + 14);
  doc.text('Date & Time: ____________________________', margin + 3, y + 18.5);
  doc.text('Signature & Official Seal', margin + 3, y + 22.5);

  // Consignor (Savitri B2B) Box
  const authX = margin + sigBoxW + 8;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(250, 250, 250);
  doc.rect(authX, y, sigBoxW, 24, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(26, 46, 10);
  doc.text('FOR SAVITRI B2B ENTERPRISE', authX + 3, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Indore Central Fulfillment & Dispatch Desk', authX + 3, y + 9);
  doc.text(`Dispatched By: ${challan.createdBy?.name || 'Authorized Officer'}`, authX + 3, y + 14);
  doc.text('Authorized Signatory', authX + sigBoxW - 32, y + 22.5);

  // ==========================================
  // 7. FOOTER
  // ==========================================
  const footerY = pageHeight - 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Delivery Challan #${challan.challanNumber || '-'} | Generated on ${new Date().toLocaleString('en-IN')} | System-generated official dispatch record`,
    margin,
    footerY
  );
  doc.text('Page 1 of 1', pageWidth - margin - 14, footerY);

  return doc;
}

/**
 * Download Delivery Challan PDF instantly
 * @param {Object} challan
 */
export async function downloadDeliveryChallanPdf(challan) {
  try {
    const logoBase64 = await getLogoBase64();
    const doc = buildDeliveryChallanPdfDocument(challan, logoBase64);
    const fileName = `Delivery_Challan_${(challan.challanNumber || 'DOC').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error('Failed to download Delivery Challan PDF:', error);
    throw error;
  }
}

/**
 * Print Delivery Challan PDF via hidden iframe
 * @param {Object} challan
 */
export async function printDeliveryChallanPdf(challan) {
  try {
    const logoBase64 = await getLogoBase64();
    const doc = buildDeliveryChallanPdfDocument(challan, logoBase64);
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
        document.body.removeChild(iframe);
        URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 60000);

    return true;
  } catch (error) {
    console.error('Failed to print Delivery Challan PDF:', error);
    throw error;
  }
}
