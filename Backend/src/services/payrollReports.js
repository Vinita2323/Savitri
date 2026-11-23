import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import Payroll from '../models/Payroll.model.js';
import PayrollItem from '../models/PayrollItem.model.js';
import SalaryPayment from '../models/SalaryPayment.model.js';
import SalaryAdjustment from '../models/SalaryAdjustment.model.js';
import { brandFilter, PayrollError } from './payrollSalary.js';
import { fmtPaise } from '../utils/payrollMoney.js';
import { isValidDateString } from './employeeCore.js';

export const REPORT_TYPES = ['monthly', 'weekly', 'daily-wage', 'employee-wise', 'outstanding', 'deductions', 'payments', 'advances'];

const FINAL = ['APPROVED', 'PARTIALLY_PAID', 'PAID'];
const PCOLS = [
  { key: 'payrollCode', label: 'Payroll', type: 'text' }, { key: 'employeeCode', label: 'Emp ID', type: 'text' }, { key: 'employeeName', label: 'Employee', type: 'text' },
  { key: 'department', label: 'Department', type: 'text' }, { key: 'salaryType', label: 'Type', type: 'text' }, { key: 'period', label: 'Period', type: 'text' },
  { key: 'gross', label: 'Gross', type: 'money' }, { key: 'deductions', label: 'Deductions', type: 'money' }, { key: 'net', label: 'Net', type: 'money' },
  { key: 'paid', label: 'Paid', type: 'money' }, { key: 'balance', label: 'Balance', type: 'money' }, { key: 'status', label: 'Status', type: 'text' },
];
const prow = (p) => ({ payrollCode: p.payrollCode, employeeCode: p.employeeCode, employeeName: p.employeeName, department: p.department, salaryType: p.salaryType, period: `${p.periodFrom} to ${p.periodTo}`, gross: p.grossPaise, deductions: p.deductionsPaise, net: p.netPaise, paid: p.paidPaise, balance: Math.max(0, p.netPaise - p.paidPaise), status: p.status });
const totalsOf = (rows, keys) => Object.fromEntries(keys.map((k) => [k, rows.reduce((t, r) => t + (r[k] || 0), 0)]));

const baseQuery = (scope, f) => {
  const q = { ...brandFilter(scope) };
  if (f.employeeId) q.employee = f.employeeId;
  if (f.department) q.department = f.department;
  if (f.salaryType) q.salaryType = f.salaryType;
  return q;
};

export const buildReport = async ({ scope, type, filters = {} }) => {
  if (!REPORT_TYPES.includes(type)) throw new PayrollError(404, 'Unknown report.');
  const f = { ...filters };
  for (const k of ['from', 'to']) if (f[k] && !isValidDateString(f[k])) throw new PayrollError(400, 'Enter valid dates.');
  const range = (field = 'periodFrom') => { const o = {}; if (f.from) o.$gte = f.from; if (f.to) o.$lte = f.to; return Object.keys(o).length ? { [field]: o } : {}; };
  const live = { status: f.status ? f.status : { $ne: 'CANCELLED' } };
  const subtitle = [f.from && `From ${f.from}`, f.to && `To ${f.to}`, f.department && `Department ${f.department}`, f.salaryType && `Type ${f.salaryType}`].filter(Boolean).join('  |  ');

  if (type === 'monthly' || type === 'weekly' || type === 'daily-wage') {
    const q = { ...baseQuery(scope, f), ...live, ...range() };
    if (type === 'monthly') q.paymentFrequency = 'MONTHLY';
    if (type === 'weekly') q.paymentFrequency = 'WEEKLY';
    if (type === 'daily-wage') q.salaryType = { $in: ['DAILY', 'HOURLY'] };
    const rows = (await Payroll.find(q).sort({ periodFrom: -1, employeeName: 1 }).limit(5000).lean()).map(prow);
    const titles = { monthly: 'Monthly payroll report', weekly: 'Weekly payroll report', 'daily-wage': 'Daily wage report' };
    return { title: titles[type], subtitle, columns: PCOLS, rows, totals: totalsOf(rows, ['gross', 'deductions', 'net', 'paid', 'balance']) };
  }

  if (type === 'employee-wise') {
    const q = { ...baseQuery(scope, f), ...live, ...range() };
    const ps = await Payroll.find(q).lean();
    const by = new Map();
    for (const p of ps) {
      const r = by.get(String(p.employee)) || { employeeCode: p.employeeCode, employeeName: p.employeeName, department: p.department, salaryType: p.salaryType, payrolls: 0, gross: 0, deductions: 0, net: 0, paid: 0, balance: 0 };
      r.payrolls += 1; r.gross += p.grossPaise; r.deductions += p.deductionsPaise; r.net += p.netPaise; r.paid += p.paidPaise; r.balance += Math.max(0, p.netPaise - p.paidPaise);
      by.set(String(p.employee), r);
    }
    const rows = [...by.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
    return {
      title: 'Employee-wise salary report', subtitle,
      columns: [{ key: 'employeeCode', label: 'Emp ID', type: 'text' }, { key: 'employeeName', label: 'Employee', type: 'text' }, { key: 'department', label: 'Department', type: 'text' }, { key: 'salaryType', label: 'Type', type: 'text' }, { key: 'payrolls', label: 'Payrolls', type: 'int' }, { key: 'gross', label: 'Gross', type: 'money' }, { key: 'deductions', label: 'Deductions', type: 'money' }, { key: 'net', label: 'Net', type: 'money' }, { key: 'paid', label: 'Paid', type: 'money' }, { key: 'balance', label: 'Balance', type: 'money' }],
      rows, totals: totalsOf(rows, ['payrolls', 'gross', 'deductions', 'net', 'paid', 'balance']),
    };
  }

  if (type === 'outstanding') {
    const q = { ...baseQuery(scope, f), status: { $in: ['PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID'] }, ...range() };
    const rows = (await Payroll.find(q).sort({ paymentDueDate: 1, employeeName: 1 }).lean()).map((p) => ({ ...prow(p), due: p.paymentDueDate || '' })).filter((r) => r.balance > 0);
    return { title: 'Outstanding salary report', subtitle, columns: [...PCOLS.slice(0, 11), { key: 'due', label: 'Due date', type: 'text' }, PCOLS[11]], rows, totals: totalsOf(rows, ['gross', 'deductions', 'net', 'paid', 'balance']) };
  }

  if (type === 'deductions') {
    const q = { ...baseQuery(scope, f), ...live, ...range() };
    const ps = await Payroll.find(q).select('_id payrollCode employeeCode employeeName department periodFrom periodTo').sort({ periodFrom: -1 }).limit(3000).lean();
    const items = await PayrollItem.find({ payroll: { $in: ps.map((p) => p._id) }, kind: 'DEDUCTION' }).lean();
    const codes = ['ABSENT', 'UNPAID_LEAVE', 'HALF_DAY', 'LATE', 'OTHER_DEDUCTION', 'ADVANCE_RECOVERY'];
    const rows = ps.map((p) => {
      const mine = items.filter((i) => String(i.payroll) === String(p._id));
      const r = { payrollCode: p.payrollCode, employeeCode: p.employeeCode, employeeName: p.employeeName, department: p.department, period: `${p.periodFrom} to ${p.periodTo}` };
      let t = 0;
      codes.forEach((c) => { r[c] = mine.filter((i) => i.code === c).reduce((s, i) => s + i.amountPaise, 0); t += r[c]; });
      r.total = t;
      return r;
    }).filter((r) => r.total > 0);
    return {
      title: 'Deduction report', subtitle,
      columns: [{ key: 'payrollCode', label: 'Payroll', type: 'text' }, { key: 'employeeCode', label: 'Emp ID', type: 'text' }, { key: 'employeeName', label: 'Employee', type: 'text' }, { key: 'department', label: 'Department', type: 'text' }, { key: 'period', label: 'Period', type: 'text' }, { key: 'ABSENT', label: 'Absent', type: 'money' }, { key: 'UNPAID_LEAVE', label: 'Unpaid leave', type: 'money' }, { key: 'HALF_DAY', label: 'Half day', type: 'money' }, { key: 'LATE', label: 'Late', type: 'money' }, { key: 'OTHER_DEDUCTION', label: 'Other', type: 'money' }, { key: 'ADVANCE_RECOVERY', label: 'Advance recovery', type: 'money' }, { key: 'total', label: 'Total', type: 'money' }],
      rows, totals: totalsOf(rows, [...codes, 'total']),
    };
  }

  if (type === 'payments') {
    const q = { ...brandFilter(scope) };
    if (f.employeeId) q.employee = f.employeeId;
    if (f.from || f.to) q.paidOn = { ...(f.from ? { $gte: f.from } : {}), ...(f.to ? { $lte: f.to } : {}) };
    if (f.method) q.method = f.method;
    const pays = await SalaryPayment.find(q).sort({ paidOn: -1, createdAt: -1 }).limit(5000).lean();
    const pm = new Map((await Payroll.find({ _id: { $in: pays.map((x) => x.payroll) } }).select('payrollCode department periodFrom periodTo').lean()).map((p) => [String(p._id), p]));
    let list = pays.map((x) => { const p = pm.get(String(x.payroll)); return { paymentCode: x.paymentCode, paidOn: x.paidOn, employeeCode: x.employeeCode, employeeName: x.employeeName, department: p?.department || '', payrollCode: p?.payrollCode || '', period: p ? `${p.periodFrom} to ${p.periodTo}` : '', method: x.method, reference: x.reference, amount: x.status === 'RECORDED' ? x.amountPaise : 0, status: x.status, recordedBy: x.recordedBy?.name || '' }; });
    if (f.department) list = list.filter((r) => r.department === f.department);
    return {
      title: 'Payment history report', subtitle,
      columns: [{ key: 'paymentCode', label: 'Payment', type: 'text' }, { key: 'paidOn', label: 'Paid on', type: 'text' }, { key: 'employeeCode', label: 'Emp ID', type: 'text' }, { key: 'employeeName', label: 'Employee', type: 'text' }, { key: 'payrollCode', label: 'Payroll', type: 'text' }, { key: 'period', label: 'Period', type: 'text' }, { key: 'method', label: 'Method', type: 'text' }, { key: 'reference', label: 'Reference', type: 'text' }, { key: 'amount', label: 'Amount', type: 'money' }, { key: 'status', label: 'Status', type: 'text' }, { key: 'recordedBy', label: 'Recorded by', type: 'text' }],
      rows: list, totals: totalsOf(list, ['amount']),
    };
  }

  // advances
  const q = { ...brandFilter(scope), type: 'ADVANCE', status: { $ne: 'CANCELLED' } };
  if (f.employeeId) q.employee = f.employeeId;
  const advs = await SalaryAdjustment.find(q).sort({ date: -1 }).lean();
  const rows = advs.map((a) => ({ employeeCode: a.employeeCode, date: a.date, description: a.description, amount: a.amountPaise, recovered: a.recoveredPaise, outstanding: Math.max(0, a.amountPaise - a.recoveredPaise), mode: a.recoveryMode === 'INSTALLMENT' ? 'Instalments' : 'At once' }));
  return { title: 'Advances report', subtitle, columns: [{ key: 'employeeCode', label: 'Emp ID', type: 'text' }, { key: 'date', label: 'Given on', type: 'text' }, { key: 'description', label: 'Note', type: 'text' }, { key: 'amount', label: 'Advance', type: 'money' }, { key: 'recovered', label: 'Recovered', type: 'money' }, { key: 'outstanding', label: 'Outstanding', type: 'money' }, { key: 'mode', label: 'Recovery', type: 'text' }], rows, totals: totalsOf(rows, ['amount', 'recovered', 'outstanding']) };
};

// ───────────────────────── renderers ─────────────────────────

const cell = (col, v) => (col.type === 'money' ? fmtPaise(v || 0) : v === undefined || v === null ? '' : String(v));

export const renderXlsx = async (table) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Savitri Payroll';
  const ws = wb.addWorksheet(table.title.slice(0, 30));
  ws.addRow([table.title]).font = { bold: true, size: 14 };
  if (table.subtitle) ws.addRow([table.subtitle]).font = { italic: true, color: { argb: 'FF666666' } };
  ws.addRow([]);
  const head = ws.addRow(table.columns.map((c) => c.label));
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } }; });
  for (const r of table.rows) ws.addRow(table.columns.map((c) => (c.type === 'money' ? (r[c.key] || 0) / 100 : r[c.key] ?? '')));
  const tr = ws.addRow(table.columns.map((c, i) => (i === 0 ? 'TOTAL' : table.totals && c.key in table.totals ? (c.type === 'money' ? table.totals[c.key] / 100 : table.totals[c.key]) : '')));
  tr.font = { bold: true };
  table.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = Math.max(12, Math.min(34, c.label.length + 6));
    if (c.type === 'money') col.numFmt = '#,##0.00';
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
};

const toBuffer = (doc) => new Promise((resolve, reject) => { const chunks = []; doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); doc.end(); });

export const renderTablePdf = async (table) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 28 });
  const W = doc.page.width - 56;
  const n = table.columns.length;
  const weights = table.columns.map((c) => (c.type === 'money' ? 1.1 : c.key === 'employeeName' || c.key === 'period' ? 1.7 : c.type === 'int' ? 0.7 : 1.25));
  const tw = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / tw) * W);
  const rowH = 17;
  const drawHead = (y) => {
    doc.save().rect(28, y, W, rowH + 3).fill('#047857').restore();
    let x = 28;
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(7.5);
    table.columns.forEach((c, i) => { doc.text(c.label, x + 3, y + 5, { width: widths[i] - 6, align: c.type === 'money' || c.type === 'int' ? 'right' : 'left', lineBreak: false, ellipsis: true }); x += widths[i]; });
    doc.fillColor('#000');
    return y + rowH + 4;
  };
  doc.font('Helvetica-Bold').fontSize(15).text(table.title, 28, 28);
  doc.font('Helvetica').fontSize(8.5).fillColor('#555').text(table.subtitle || '', 28, 48).text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}  |  Amounts in INR`, 28, 60).fillColor('#000');
  let y = drawHead(80);
  const line = (vals, bold) => {
    if (y > doc.page.height - 50) { doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 }); y = drawHead(28); }
    let x = 28;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5);
    vals.forEach((v, i) => { const c = table.columns[i]; doc.text(v, x + 3, y + 4, { width: widths[i] - 6, align: c.type === 'money' || c.type === 'int' ? 'right' : 'left', lineBreak: false, ellipsis: true }); x += widths[i]; });
    doc.moveTo(28, y + rowH).lineTo(28 + W, y + rowH).lineWidth(0.3).strokeColor('#ccc').stroke().strokeColor('#000');
    y += rowH;
  };
  table.rows.forEach((r) => line(table.columns.map((c) => cell(c, r[c.key]))));
  line(table.columns.map((c, i) => (i === 0 ? 'TOTAL' : table.totals && c.key in table.totals ? cell(c, table.totals[c.key]) : '')), true);
  if (!table.rows.length) doc.font('Helvetica').fontSize(10).text('No records for these filters.', 28, y + 12);
  return toBuffer(doc);
};

const UNIT = (l) => (l.unit === 'DAY_CENTI' ? `${(l.quantity / 100).toFixed(2).replace(/\.00$/, '')} day(s)` : l.unit === 'MINUTE' ? `${Math.floor(l.quantity / 60)}h ${l.quantity % 60}m` : l.unit === 'COUNT' && l.code === 'LATE' ? `${l.quantity} late` : '');

export const renderSlipPdf = async (d) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const L = 40; const W = doc.page.width - 80;
  const money = (p) => `Rs. ${fmtPaise(p)}`;
  doc.rect(L, 36, W, 64).fill('#047857');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(17).text(d.company.name, L + 14, 46);
  doc.font('Helvetica').fontSize(8.5).text([d.company.address, d.company.contact, d.company.email, d.company.gst && `GSTIN ${d.company.gst}`].filter(Boolean).join('  |  '), L + 14, 68, { width: W - 28 });
  doc.fillColor('#000').font('Helvetica-Bold').fontSize(13).text('SALARY SLIP', L, 112, { width: W, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor('#555').text(`Period: ${d.periodFrom} to ${d.periodTo}   |   Payroll no: ${d.payrollCode}   |   Status: ${d.status.replace('_', ' ')}`, L, 130, { width: W, align: 'center' }).fillColor('#000');

  const box = (y, h) => doc.roundedRect(L, y, W, h, 4).lineWidth(0.6).strokeColor('#cbd5e1').stroke().strokeColor('#000');
  const kv = (x, y, k, v) => { doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(k, x, y); doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#000').text(String(v || '-'), x, y + 10, { width: 160 }); };
  box(152, 62);
  kv(L + 12, 160, 'Employee', d.employeeName); kv(L + 182, 160, 'Employee ID', d.employeeCode); kv(L + 352, 160, 'Salary type', `${d.salaryType} (${d.paymentFrequency.toLowerCase()})`);
  kv(L + 12, 186, 'Department', d.department); kv(L + 182, 186, 'Designation', d.designation); kv(L + 352, 186, 'Payment due', d.paymentDueDate);

  const s = d.summary || {};
  const paidDays = ((s.paidDayCenti || 0) / 100).toFixed(2).replace(/\.00$/, '');
  box(222, 40);
  const stat = (x, k, v) => { doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(k, x, 229); doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text(String(v), x, 241); };
  stat(L + 12, 'Paid days', paidDays); stat(L + 92, 'Present', s.present ?? 0); stat(L + 160, 'Paid leave', s.paidLeave ?? 0); stat(L + 240, 'Unpaid leave', s.unpaidLeave ?? 0); stat(L + 330, 'Absent', s.absent ?? 0); stat(L + 392, 'Late', s.late ?? 0); stat(L + 438, 'Half days', s.halfDay ?? 0); stat(L + 496, 'OT approved', `${Math.floor((d.overtimeApprovedMinutes || 0) / 60)}h ${(d.overtimeApprovedMinutes || 0) % 60}m`);

  const earn = d.items.filter((i) => i.kind === 'EARNING'); const ded = d.items.filter((i) => i.kind === 'DEDUCTION');
  const colW = (W - 12) / 2;
  const table = (x, y, title, rows, total) => {
    doc.rect(x, y, colW, 18).fill('#ecfdf5'); doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9).text(title, x + 8, y + 5).fillColor('#000');
    let yy = y + 24;
    rows.forEach((r) => {
      const note = UNIT(r);
      doc.font('Helvetica').fontSize(8.5).text(r.label, x + 8, yy, { width: colW - 100, lineBreak: false, ellipsis: true });
      if (note) doc.fontSize(7).fillColor('#64748b').text(note, x + 8, yy + 10, { width: colW - 100 }).fillColor('#000');
      doc.font('Helvetica').fontSize(8.5).text(money(r.amountPaise), x + colW - 92, yy, { width: 84, align: 'right' });
      yy += note ? 24 : 16;
    });
    if (!rows.length) { doc.font('Helvetica').fontSize(8.5).fillColor('#94a3b8').text('None', x + 8, yy).fillColor('#000'); yy += 16; }
    doc.moveTo(x, yy + 2).lineTo(x + colW, yy + 2).lineWidth(0.6).strokeColor('#94a3b8').stroke().strokeColor('#000');
    doc.font('Helvetica-Bold').fontSize(9).text(`Total ${title.toLowerCase()}`, x + 8, yy + 8).text(money(total), x + colW - 92, yy + 8, { width: 84, align: 'right' });
    return yy + 24;
  };
  const e1 = table(L, 272, 'Earnings', earn, d.grossPaise);
  const e2 = table(L + colW + 12, 272, 'Deductions', ded, d.deductionsPaise);
  let y = Math.max(e1, e2) + 6;

  doc.rect(L, y, W, 50).fill('#f1f5f9').fillColor('#000');
  const big = (x, k, v, color = '#000') => { doc.font('Helvetica').fontSize(8).fillColor('#64748b').text(k, x, y + 9); doc.font('Helvetica-Bold').fontSize(13).fillColor(color).text(v, x, y + 22); };
  big(L + 14, 'Gross salary', money(d.grossPaise)); big(L + 150, 'Total deductions', money(d.deductionsPaise)); big(L + 290, 'Net salary', money(d.netPaise), '#047857'); big(L + 400, 'Paid', money(d.paidPaise)); big(L + 480 - 6, 'Balance', money(d.balancePaise), d.balancePaise > 0 ? '#b45309' : '#000');
  doc.fillColor('#000');
  y += 64;
  doc.font('Helvetica-Bold').fontSize(10).text('Payments', L, y); y += 16;
  const pays = (d.payments || []).filter((p) => p.status === 'RECORDED');
  if (!pays.length) { doc.font('Helvetica').fontSize(8.5).fillColor('#64748b').text('No payment has been recorded yet.', L, y).fillColor('#000'); y += 16; } else {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b'); [['Date', 0], ['Method', 90], ['Reference', 190], ['Amount', 440]].forEach(([t, o]) => doc.text(t, L + o, y, { width: o === 440 ? 75 : 110, align: o === 440 ? 'right' : 'left' })); y += 12; doc.fillColor('#000');
    pays.forEach((p) => { doc.font('Helvetica').fontSize(8.5).text(p.paidOn, L, y).text(p.method.replace('_', ' '), L + 90, y).text(p.reference || '-', L + 190, y, { width: 240, lineBreak: false, ellipsis: true }).text(money(p.amountPaise), L + 440, y, { width: 75, align: 'right' }); y += 13; });
  }
  if (d.warnings?.length) { y += 6; doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#64748b').text(`Notes: ${d.warnings.join(' ')}`, L, y, { width: W }).fillColor('#000'); }
  doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text('This is a computer generated salary slip. Attendance-based amounts were calculated from approved attendance records.', L, doc.page.height - 50, { width: W, align: 'center' });
  return toBuffer(doc);
};
