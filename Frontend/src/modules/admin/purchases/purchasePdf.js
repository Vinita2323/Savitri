import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// The standard PDF fonts have no rupee sign, so amounts are written as "Rs. 1,234.50".
const rs = (paise) => `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((Number(paise) || 0) / 100)}`;
const ist = (v, time) => (v ? new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }) : '-');
const PAY = { PAID: 'Paid', PARTIAL: 'Partially paid', UNPAID: 'Unpaid' };

/** One purchase as an A4 PDF: details, products, totals, stock movements and history (the same data the drawer shows). */
export const downloadPurchasePdf = (d) => {
  const p = d.purchase;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(26, 46, 10).text('Purchase Record', M, 48);
  doc.setFontSize(11).setTextColor(0).text(p.purchaseId, M, 68);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100).text([p.storeName, `Purchase date: ${ist(p.purchaseDate)}`].filter(Boolean).join('  |  '), M, 82);
  doc.text(`Status: ${p.status}   |   Payment: ${PAY[p.paymentStatus] || p.paymentStatus || '-'}${p.paymentMethod ? ` (${p.paymentMethod})` : ''}`, M, 95);

  const info = [
    ['Supplier', p.supplierName || '-'],
    ['Contact', [p.supplierPhone, p.supplierEmail].filter(Boolean).join(' | ') || '-'],
    ['Address', p.supplierAddress || '-'],
    ['Invoice no.', p.invoiceNumber || '-'],
    ['Recorded', ist(p.createdAt, true)],
  ];
  if (p.notes) info.push(['Notes', p.notes]);
  autoTable(doc, { startY: 108, body: info, theme: 'plain', styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80, textColor: 100 } }, margin: { left: M, right: M } });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 12,
    head: [['Product', 'SKU', 'Qty', 'Price', 'GST', 'Amount', 'Stock before', 'Stock after']],
    body: p.lines.map((l) => [`${l.productName}${l.variantTitle ? ` (${l.variantTitle})` : ''}`, l.sku || '-', l.quantity, rs(l.unitPricePaise), rs(l.gstPaise), rs((l.subtotalPaise || 0) + (l.gstPaise || 0)), l.previousStock ?? '-', l.newStock ?? '-']),
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [4, 120, 87], textColor: 255 },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    margin: { left: M, right: M },
  });

  const totals = [
    ['Subtotal', rs(p.subtotalPaise)], ['GST', rs(p.gstPaise)], ['Additional expenses', rs(p.additionalExpensesPaise)], ['Discount', `-${rs(p.discountPaise)}`],
    ['Final amount', rs(p.finalPaise)], ['Paid', rs(p.paidPaise)], ['Balance', rs(p.balancePaise)],
  ];
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 12, body: totals, theme: 'plain', tableWidth: 220, margin: { left: W - M - 220, right: M },
    styles: { fontSize: 9.5, cellPadding: 2.5 }, columnStyles: { 1: { halign: 'right' } },
    didParseCell: (c) => { if (c.row.index === 4 || c.row.index === 6) c.cell.styles.fontStyle = 'bold'; },
  });

  if (p.status === 'CANCELLED') {
    doc.setFontSize(9).setTextColor(180, 40, 40).text(`Cancelled ${ist(p.cancelledAt, true)} by ${p.cancelledBy || '-'}: ${p.cancelReason || ''}`, M, doc.lastAutoTable.finalY + 16, { maxWidth: W - 2 * M });
    doc.lastAutoTable.finalY += 14;
  }
  if (p.invoiceFile) doc.setFontSize(9).setTextColor(100).text(`Bill attached: ${p.invoiceFile.name}`, M, doc.lastAutoTable.finalY + 16);

  if (d.movements?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 30, head: [['Stock movements (permanent record)', '', '', '', '', '']],
      body: [['When', 'Type', 'Product', 'Change', 'Before', 'After'], ...d.movements.map((m) => [ist(m.at, true), String(m.type).replace('PURCHASE_', '').toLowerCase(), m.productName, `${m.change > 0 ? '+' : ''}${m.change}`, m.previousStock ?? '-', m.newStock ?? '-'])],
      styles: { fontSize: 8.5, cellPadding: 3 }, headStyles: { fillColor: [100, 116, 139], textColor: 255 },
      didParseCell: (c) => { if (c.section === 'body' && c.row.index === 0) { c.cell.styles.fontStyle = 'bold'; c.cell.styles.fillColor = [241, 245, 249]; } },
      margin: { left: M, right: M },
    });
  }
  if (p.history?.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 16, head: [['History', '', '']],
      body: [...p.history].reverse().map((h) => [String(h.action).toLowerCase().replace(/_/g, ' '), `${h.by || '-'}  |  ${ist(h.at, true)}`, h.note || '']),
      styles: { fontSize: 8.5, cellPadding: 3 }, headStyles: { fillColor: [100, 116, 139], textColor: 255 }, margin: { left: M, right: M },
    });
  }
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= doc.getNumberOfPages(); i += 1) {
    doc.setPage(i); doc.setFontSize(8).setTextColor(150).text(`Page ${i} of ${doc.getNumberOfPages()}  |  Generated ${ist(new Date(), true)}`, W - M, H - 20, { align: 'right' });
  }
  doc.save(`${p.purchaseId}.pdf`);
};
