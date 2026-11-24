import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/** "Rs. 1,23,456.50": the standard PDF fonts have no rupee sign, so the amount is written with "Rs." */
export const pdfMoney = (v) => `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0)}`;

/**
 * A simple landscape A4 table report.
 * columns: ['Date', 'Seller', ...]   rows: [[...], ...]   totals: optional last row (bold)
 * numericColumns: indexes of columns to right-align
 */
export const downloadTablePdf = ({ title, subtitle = '', columns, rows, totals = null, numericColumns = [], filename }) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(26, 46, 10).text(title, 36, 40);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100);
  if (subtitle) doc.text(subtitle, 36, 56, { maxWidth: W - 72 });
  doc.text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  Amounts in INR`, 36, subtitle ? 70 : 56);
  const body = totals ? [...rows, totals] : rows;
  autoTable(doc, {
    startY: subtitle ? 82 : 68,
    head: [columns],
    body,
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [4, 120, 87], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(numericColumns.map((i) => [i, { halign: 'right' }])),
    didParseCell: (d) => {
      if (totals && d.section === 'body' && d.row.index === body.length - 1) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [236, 253, 245]; }
    },
    margin: { left: 36, right: 36 },
    didDrawPage: () => {
      doc.setFontSize(8).setTextColor(150).text(`Page ${doc.getNumberOfPages()}`, W - 36, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    },
  });
  if (!rows.length) doc.setFontSize(10).setTextColor(100).text('No records for these filters.', 36, (doc.lastAutoTable?.finalY || 100) + 24);
  doc.save(filename);
};
