import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format currency in Indian Rupees (INR)
 * @param {number} val
 * @returns {string} e.g. "Rs. 1,450.00"
 */
function formatCurrency(val) {
  const n = parseFloat(val) || 0;
  return 'Rs. ' + n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

/**
 * Builds a vector-based A4 Tax Invoice PDF for POS Sale
 * @param {Object} sale
 * @returns {jsPDF}
 */
export function buildPosA4Pdf(sale) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const store = sale.store || {};
  const customer = sale.customer || {};
  const items = sale.items || [];
  const payment = sale.payment || {};
  const isDelivery = sale.saleType === 'DELIVERY_ORDER';

  let y = 14;

  // 1. Top Header Box & Company Branding
  doc.setFillColor(16, 185, 129); // Emerald primary #10b981
  doc.rect(margin, y, 6, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(store.storeName || 'SHIPPEX RETAIL & COMMERCE', margin + 9, y + 5);

  // Document Type Badge on Right
  const badgeW = 42;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(badgeX, y - 2, badgeW, 8, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('TAX INVOICE', badgeX + badgeW / 2, y + 3.2, { align: 'center' });

  y += 10;

  // Store Address & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  if (store.address) {
    doc.text(store.address, margin, y);
    y += 4;
  }
  doc.text(`Phone: ${store.phone || '+91 9876543210'} | GSTIN: ${store.gstin || '23AAECS9124K1ZX'}`, margin, y);

  y += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // 2. Invoice Meta & Customer Details Grid
  const colWidth = contentWidth / 2 - 3;
  const boxH = 26;

  // Left Box: Customer Info
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, colWidth, boxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO / CUSTOMER', margin + 3.5, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.name || 'Walk-in Customer', margin + 3.5, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (customer.phone) {
    doc.text(`Phone: +91 ${customer.phone}`, margin + 3.5, y + 14);
  }
  if (isDelivery && customer.shippingAddress?.addressLine1) {
    const addr = `${customer.shippingAddress.addressLine1}, ${customer.shippingAddress.city || 'Indore'}`;
    doc.text(doc.splitTextToSize(`Delivery: ${addr}`, colWidth - 7), margin + 3.5, y + 18.5);
  } else {
    doc.text('Counter Walk-in Sale (Direct Fulfillment)', margin + 3.5, y + 18.5);
  }

  // Right Box: Invoice Meta
  const rightX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightX, y, colWidth, boxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE INFORMATION', rightX + 3.5, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text('Invoice Number:', rightX + 3.5, y + 9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.invoiceNumber || 'POS-2026-00001', rightX + colWidth - 3.5, y + 9.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Date & Time:', rightX + 3.5, y + 14);
  doc.text(new Date(sale.createdAt || Date.now()).toLocaleString('en-IN'), rightX + colWidth - 3.5, y + 14, { align: 'right' });

  doc.text('Sale Channel:', rightX + 3.5, y + 18.5);
  doc.setFont('helvetica', 'bold');
  doc.text(isDelivery ? 'Delivery Order (POS)' : 'Counter Sale (POS)', rightX + colWidth - 3.5, y + 18.5, { align: 'right' });

  if (isDelivery && sale.orderId) {
    doc.setFont('helvetica', 'normal');
    doc.text('Order Reference:', rightX + 3.5, y + 23);
    doc.setFont('helvetica', 'bold');
    doc.text(sale.orderId, rightX + colWidth - 3.5, y + 23, { align: 'right' });
  }

  y += boxH + 6;

  // 3. Line Items Table using autoTable
  const tableData = items.map((it, idx) => [
    idx + 1,
    it.name || 'Product',
    it.sku || '-',
    it.quantity,
    formatCurrency(it.salePrice),
    it.discountPercent > 0 ? `${it.discountPercent}%` : '-',
    `${it.taxRate || 5}%`,
    formatCurrency(it.lineTotal),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description', 'SKU/Code', 'Qty', 'Unit Price', 'Disc.', 'GST', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129], // Emerald primary
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2.8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 64 },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // 4. Totals and Payment Summary Box
  const summaryBoxW = 80;
  const summaryBoxX = pageWidth - margin - summaryBoxW;

  // Left Side: Payment Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment Information', margin, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Payment Mode: ${payment.method || 'CASH'} (${payment.status || 'PAID'})`, margin, y + 7);
  if (payment.amountReceived > 0) {
    doc.text(`Amount Tendered: ${formatCurrency(payment.amountReceived)}`, margin, y + 11.5);
  }
  if (payment.balanceDue > 0) {
    doc.setTextColor(225, 29, 72);
    doc.setFont('helvetica', 'bold');
    doc.text(`Balance Due: ${formatCurrency(payment.balanceDue)}`, margin, y + 16);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
  }
  if (payment.referenceNumber) {
    doc.text(`Reference / UTR: ${payment.referenceNumber}`, margin, y + 20.5);
  }

  // Right Side: Detailed Tax & Total Calculation
  const subtotal = Number(sale.subtotal) || 0;
  const itemDiscounts = Number(sale.itemDiscountsTotal) || 0;
  const billDiscount = Number(sale.billDiscountAmount) || 0;
  const taxable = Number(sale.taxableAmount) || subtotal;
  const gstTotal = Number(sale.gstTotal) || 0;
  const delivery = Number(sale.deliveryCharge) || 0;
  const grandTotal = Number(sale.grandTotal) || 0;

  const rows = [
    ['Subtotal:', formatCurrency(subtotal)],
    ...(itemDiscounts > 0 ? [['Item Discounts:', '-' + formatCurrency(itemDiscounts)]] : []),
    ...(billDiscount > 0 ? [[`Bill Discount (${sale.billDiscountPercent}%):`, '-' + formatCurrency(billDiscount)]] : []),
    ['Taxable Amount:', formatCurrency(taxable)],
    ['CGST:', formatCurrency(gstTotal / 2)],
    ['SGST:', formatCurrency(gstTotal / 2)],
    ...(isDelivery ? [['Delivery Charge:', delivery === 0 ? 'FREE' : formatCurrency(delivery)]] : []),
  ];

  let sumY = y;
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, summaryBoxX, sumY);
    doc.setTextColor(15, 23, 42);
    doc.text(val, pageWidth - margin, sumY, { align: 'right' });
    sumY += 4.5;
  });

  // Grand Total Line
  doc.setDrawColor(203, 213, 225);
  doc.line(summaryBoxX, sumY - 1, pageWidth - margin, sumY - 1);
  sumY += 3;

  doc.setFillColor(240, 253, 244);
  doc.rect(summaryBoxX, sumY - 3, summaryBoxW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Grand Total:', summaryBoxX + 2, sumY + 2.5);
  doc.text(formatCurrency(grandTotal), pageWidth - margin - 2, sumY + 2.5, { align: 'right' });

  // 5. Footer Notes
  const footerY = 278;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated tax invoice and requires no physical signature.', margin, footerY + 4);
  doc.text('Powered by ShippNex Quick POS Billing System', pageWidth - margin, footerY + 4, { align: 'right' });

  return doc;
}

/**
 * Builds an 80mm Thermal Slip PDF for POS Sale
 * Dimensions: 80mm width x dynamic height
 * @param {Object} sale
 * @returns {jsPDF}
 */
export function buildPosThermalPdf(sale) {
  const store = sale.store || {};
  const customer = sale.customer || {};
  const items = sale.items || [];
  const payment = sale.payment || {};
  const isDelivery = sale.saleType === 'DELIVERY_ORDER';

  // Compute dynamic height based on item count (minimum 160mm)
  const estimatedHeight = Math.max(160, 100 + items.length * 10);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, estimatedHeight],
  });

  const pageWidth = 80;
  const margin = 4;
  let y = 6;

  // Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(store.storeName || 'SHIPPEX RETAIL', pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  if (store.address) {
    const addrLines = doc.splitTextToSize(store.address, pageWidth - margin * 2);
    doc.text(addrLines, pageWidth / 2, y, { align: 'center' });
    y += addrLines.length * 3.5;
  }
  doc.text(`Phone: ${store.phone || '+91 9876543210'}`, pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  if (store.gstin) {
    doc.text(`GSTIN: ${store.gstin}`, pageWidth / 2, y, { align: 'center' });
    y += 3.5;
  }

  doc.setFont('courier', 'bold');
  doc.text(isDelivery ? '--- DELIVERY ORDER BILL ---' : '--- RETAIL POS RECEIPT ---', pageWidth / 2, y, { align: 'center' });
  y += 4.5;

  // Divider
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // Meta
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Invoice: ${sale.invoiceNumber || 'POS-0001'}`, margin, y);
  y += 3.5;
  doc.text(`Date: ${new Date(sale.createdAt || Date.now()).toLocaleString('en-IN')}`, margin, y);
  y += 3.5;
  doc.text(`Customer: ${customer.name || 'Walk-in'}`, margin, y);
  y += 3.5;
  if (customer.phone) {
    doc.text(`Phone: +91 ${customer.phone}`, margin, y);
    y += 3.5;
  }
  if (isDelivery && sale.orderId) {
    doc.text(`Order ID: ${sale.orderId}`, margin, y);
    y += 3.5;
  }

  // Divider
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items Table
  const tableData = items.map((it) => [
    it.name || 'Item',
    it.quantity,
    `Rs.${it.salePrice}`,
    `Rs.${it.lineTotal}`,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Item', 'Qty', 'Rate', 'Total']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      font: 'courier',
      fontSize: 7,
      fontStyle: 'bold',
      cellPadding: 1,
      textColor: [0, 0, 0],
    },
    bodyStyles: {
      font: 'courier',
      fontSize: 7,
      cellPadding: 1,
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 8, halign: 'center' },
      2: { cellWidth: 15, halign: 'right' },
      3: { cellWidth: 17, halign: 'right' },
    },
    styles: {
      overflow: 'linebreak',
    },
  });

  y = doc.lastAutoTable.finalY + 3;

  // Divider
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;

  // Summary
  const subtotal = Number(sale.subtotal) || 0;
  const discounts = (Number(sale.itemDiscountsTotal) || 0) + (Number(sale.billDiscountAmount) || 0);
  const gst = Number(sale.gstTotal) || 0;
  const delivery = Number(sale.deliveryCharge) || 0;
  const grandTotal = Number(sale.grandTotal) || 0;

  doc.text('Subtotal:', margin, y);
  doc.text(`Rs.${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 3.5;

  if (discounts > 0) {
    doc.text('Discounts:', margin, y);
    doc.text(`-Rs.${discounts.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 3.5;
  }

  doc.text('GST Total:', margin, y);
  doc.text(`Rs.${gst.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 3.5;

  if (isDelivery) {
    doc.text('Delivery Fee:', margin, y);
    doc.text(delivery === 0 ? 'FREE' : `Rs.${delivery.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 3.5;
  }

  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.text('GRAND TOTAL:', margin, y);
  doc.text(`Rs.${grandTotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 4.5;

  // Payment
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.text(`Payment: ${payment.method || 'CASH'} (${payment.status || 'PAID'})`, margin, y);
  y += 3;
  if (payment.amountReceived > 0) {
    doc.text(`Tendered: Rs.${payment.amountReceived.toFixed(2)}`, margin, y);
    y += 3;
  }
  if (payment.balanceDue > 0) {
    doc.text(`Balance Due: Rs.${payment.balanceDue.toFixed(2)}`, margin, y);
    y += 3;
  }

  // Footer
  y += 3;
  doc.text('*** THANK YOU FOR SHOPPING ***', pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text('Powered by ShippNex POS', pageWidth / 2, y, { align: 'center' });

  return doc;
}

/**
 * Downloads POS Receipt PDF with automatic format selection
 * @param {Object} sale
 * @param {'A4' | 'THERMAL'} format
 */
export function downloadPosReceiptPdf(sale, format = 'A4') {
  if (!sale) return false;

  const safeNum = (sale.invoiceNumber || 'POS_Receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safeNum}_${format === 'THERMAL' ? 'Thermal' : 'Invoice'}.pdf`;

  const doc = format === 'THERMAL' ? buildPosThermalPdf(sale) : buildPosA4Pdf(sale);

  // Direct download
  doc.save(filename);

  // Also open preview in new tab for convenient printing/viewing
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (_) {}

  return true;
}

/**
 * Clean isolated iframe printer for POS receipts
 * @param {HTMLElement} element
 * @param {'THERMAL' | 'A4'} format
 * @param {string} title
 */
export function printPosReceiptDocument(element, format = 'THERMAL', title = 'POS Receipt') {
  if (!element) {
    window.print();
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
    window.print();
    return;
  }

  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  const pageCss =
    format === 'THERMAL'
      ? `@page { size: 80mm auto; margin: 3mm; }`
      : `@page { size: A4 portrait; margin: 10mm; }`;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        ${headStyles}
        <style>
          ${pageCss}
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
          }
          .pos-print-wrapper {
            width: 100% !important;
            max-width: ${format === 'THERMAL' ? '80mm' : '100%'} !important;
            margin: 0 auto !important;
            padding: ${format === 'THERMAL' ? '4px' : '0'} !important;
            box-shadow: none !important;
            border: none !important;
          }
        </style>
      </head>
      <body>
        <div class="pos-print-wrapper">
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
      console.error('Iframe print error:', e);
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }
  }, 350);
}
