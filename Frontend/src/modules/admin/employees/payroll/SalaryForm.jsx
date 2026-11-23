import React, { useEffect, useState } from 'react';
import payrollService from '../../../../services/payrollService';
import { Notice, Spinner, btnGhost, btnPrimary, inputCls } from '../../../employee/components/ui';
import { Labeled, Modal, TYPE_LABEL, FREQ_LABEL, METHOD_LABEL, fmtMoney, paiseToInput, today, monthStart } from './payrollUi';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity/Paternity', 'Compensatory Off'];

export const emptySalary = () => ({
  salaryType: 'MONTHLY', baseAmount: '', paymentFrequency: 'MONTHLY', customPeriodDays: '', paymentDay: '', effectiveFrom: monthStart(), effectiveTo: '',
  weeklyOffDays: ['Sunday'], workingHoursPerDay: '8', monthlyBasis: 'CALENDAR_DAYS', weeklyMode: 'FIXED_WEEKLY',
  overtimeEnabled: false, overtimeRateType: 'MULTIPLIER', overtimeRate: '1.5',
  lateDeductionEnabled: false, lateAllowedPerPeriod: '3', lateDeductionPercent: '25',
  halfDayDeductionEnabled: true, unpaidLeaveDeductionEnabled: true, absentDeductionEnabled: true,
  paidLeaveTypes: [...LEAVE_TYPES], paidWeeklyOffs: false, paidHolidays: false,
  paymentMethod: 'BANK_TRANSFER', bank: { accountHolder: '', accountNumber: '', ifsc: '', bankName: '' }, upiId: '', reason: '',
});

/** A stored structure (API shape) -> form state */
export const salaryToForm = (s) => ({
  ...emptySalary(),
  salaryType: s.salaryType, baseAmount: paiseToInput(s.baseAmountPaise), paymentFrequency: s.paymentFrequency, customPeriodDays: s.customPeriodDays ? String(s.customPeriodDays) : '',
  paymentDay: s.paymentDay || '', effectiveFrom: s.effectiveFrom, effectiveTo: s.effectiveTo || '', weeklyOffDays: [...(s.weeklyOffDays || [])],
  workingHoursPerDay: String(s.workingHoursPerDay), monthlyBasis: s.monthlyBasis, weeklyMode: s.weeklyMode, overtimeEnabled: s.overtimeEnabled, overtimeRateType: s.overtimeRateType,
  overtimeRate: s.overtimeRateType === 'MULTIPLIER' ? String(s.overtimeRate ?? 1.5) : paiseToInput(s.overtimeFixedPerHourPaise),
  lateDeductionEnabled: s.lateDeductionEnabled, lateAllowedPerPeriod: String(s.lateAllowedPerPeriod ?? 3), lateDeductionPercent: String(s.lateDeductionPercent ?? 25),
  halfDayDeductionEnabled: s.halfDayDeductionEnabled, unpaidLeaveDeductionEnabled: s.unpaidLeaveDeductionEnabled, absentDeductionEnabled: s.absentDeductionEnabled,
  paidLeaveTypes: [...(s.paidLeaveTypes || [])], paidWeeklyOffs: s.paidWeeklyOffs, paidHolidays: s.paidHolidays, paymentMethod: s.paymentMethod,
  bank: { accountHolder: s.bank?.accountHolder || '', accountNumber: s.bank?.accountNumber || '', ifsc: s.bank?.ifsc || '', bankName: s.bank?.bankName || '' }, upiId: s.upiId || '', reason: '',
});

export const formToBody = (f, extra = {}) => ({
  ...f, workingDaysPerWeek: 7 - f.weeklyOffDays.length, workingHoursPerDay: Number(f.workingHoursPerDay), customPeriodDays: f.customPeriodDays ? Number(f.customPeriodDays) : 0,
  lateAllowedPerPeriod: Number(f.lateAllowedPerPeriod), lateDeductionPercent: Number(f.lateDeductionPercent), effectiveTo: f.effectiveTo || null, ...extra,
});

const Check = ({ label, checked, onChange, testId, hint }) => (
  <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
    <input type="checkbox" data-testid={testId} className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}{hint && <span className="block text-[11px] text-slate-400">{hint}</span>}</span>
  </label>
);

const Section = ({ title, children }) => (
  <div className="rounded-xl border border-slate-200 p-4 space-y-3">
    <p className="m-0 text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
    {children}
  </div>
);

/** The salary fields. Money is typed as text and sent as text: the server parses it exactly. */
export const SalaryFormFields = ({ form, setForm }) => {
  const set = (patch) => setForm({ ...form, ...patch });
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const t = form.salaryType;
  const unitLabel = { MONTHLY: 'per month', WEEKLY: 'per week', DAILY: 'per day', HOURLY: 'per hour' }[t];
  return (
    <div className="space-y-4" data-testid="salary-form">
      <Section title="Salary">
        <div className="grid sm:grid-cols-2 gap-3">
          <Labeled label="Salary type"><select data-testid="sal-type" className={inputCls} value={t} onChange={(e) => set({ salaryType: e.target.value })}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Labeled>
          <Labeled label={`Base salary amount (₹ ${unitLabel})`}><input data-testid="sal-base" inputMode="decimal" className={inputCls} placeholder="e.g. 30000" value={form.baseAmount} onChange={(e) => set({ baseAmount: e.target.value })} /></Labeled>
          <Labeled label="Payment frequency" hint="How often it is paid. Separate from the salary type."><select data-testid="sal-freq" className={inputCls} value={form.paymentFrequency} onChange={(e) => set({ paymentFrequency: e.target.value })}>{Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Labeled>
          {form.paymentFrequency === 'CUSTOM' && <Labeled label="Custom period (days)"><input data-testid="sal-custom" type="number" min="1" max="92" className={inputCls} value={form.customPeriodDays} onChange={(e) => set({ customPeriodDays: e.target.value })} /></Labeled>}
          {form.paymentFrequency === 'MONTHLY' && <Labeled label="Pay on day of month" hint="1 to 28, or LAST"><input data-testid="sal-payday" className={inputCls} placeholder="1" value={form.paymentDay} onChange={(e) => set({ paymentDay: e.target.value.toUpperCase() })} /></Labeled>}
          {form.paymentFrequency === 'WEEKLY' && <Labeled label="Pay every"><select data-testid="sal-payday" className={inputCls} value={form.paymentDay || 'Saturday'} onChange={(e) => set({ paymentDay: e.target.value })}>{WEEKDAYS.map((d) => <option key={d}>{d}</option>)}</select></Labeled>}
          <Labeled label="Salary effective from"><input data-testid="sal-from" type="date" className={inputCls} value={form.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} /></Labeled>
          <Labeled label="Salary effective to (optional)"><input data-testid="sal-to" type="date" className={inputCls} value={form.effectiveTo} min={form.effectiveFrom} onChange={(e) => set({ effectiveTo: e.target.value })} /></Labeled>
        </div>
        {t === 'MONTHLY' && <Labeled label="Monthly pay is divided by" hint="Calendar days: every day of the month counts. Working days: weekly offs and holidays are left out."><select data-testid="sal-basis" className={inputCls} value={form.monthlyBasis} onChange={(e) => set({ monthlyBasis: e.target.value })}><option value="CALENDAR_DAYS">Calendar days of the month</option><option value="WORKING_DAYS">Working days of the month</option></select></Labeled>}
        {t === 'WEEKLY' && <Labeled label="Weekly salary works as"><select data-testid="sal-wmode" className={inputCls} value={form.weeklyMode} onChange={(e) => set({ weeklyMode: e.target.value })}><option value="FIXED_WEEKLY">Fixed weekly amount (absences are deducted)</option><option value="DAILY_RATE">Daily rate x days worked (weekly amount / working days)</option></select></Labeled>}
      </Section>

      <Section title="Working pattern">
        <div>
          <p className="m-0 mb-1.5 text-xs font-semibold text-slate-600">Weekly off days</p>
          <div className="flex flex-wrap gap-1.5">{WEEKDAYS.map((d) => <button key={d} type="button" data-testid={`sal-off-${d}`} aria-pressed={form.weeklyOffDays.includes(d)} onClick={() => set({ weeklyOffDays: toggle(form.weeklyOffDays, d) })} className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${form.weeklyOffDays.includes(d) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>{d.slice(0, 3)}</button>)}</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Labeled label="Working days per week" hint="Worked out from the weekly offs"><input data-testid="sal-wdpw" className={`${inputCls} bg-slate-50`} readOnly value={7 - form.weeklyOffDays.length} /></Labeled>
          <Labeled label="Working hours per day"><input data-testid="sal-hours" inputMode="decimal" className={inputCls} value={form.workingHoursPerDay} onChange={(e) => set({ workingHoursPerDay: e.target.value })} /></Labeled>
        </div>
        {(t === 'DAILY' || t === 'HOURLY' || (t === 'WEEKLY' && form.weeklyMode === 'DAILY_RATE')) && (
          <div className="flex flex-wrap gap-4">
            <Check testId="sal-paidoff" label="Pay weekly off days" checked={form.paidWeeklyOffs} onChange={(v) => set({ paidWeeklyOffs: v })} />
            <Check testId="sal-paidhol" label="Pay public holidays" checked={form.paidHolidays} onChange={(v) => set({ paidHolidays: v })} />
          </div>
        )}
      </Section>

      <Section title="Overtime">
        <Check testId="sal-ot" label="Overtime is enabled" hint="Hours beyond the working hours of a day. Only approved overtime is paid." checked={form.overtimeEnabled} onChange={(v) => set({ overtimeEnabled: v })} />
        {form.overtimeEnabled && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Labeled label="Overtime rate is"><select data-testid="sal-ottype" className={inputCls} value={form.overtimeRateType} onChange={(e) => set({ overtimeRateType: e.target.value, overtimeRate: e.target.value === 'MULTIPLIER' ? '1.5' : '' })}><option value="MULTIPLIER">A multiple of the normal hourly pay</option><option value="FIXED_PER_HOUR">A fixed amount per hour</option></select></Labeled>
            <Labeled label={form.overtimeRateType === 'MULTIPLIER' ? 'Multiplier (1 to 10, e.g. 1.5)' : 'Amount per hour (₹)'}><input data-testid="sal-otrate" inputMode="decimal" className={inputCls} value={form.overtimeRate} onChange={(e) => set({ overtimeRate: e.target.value })} /></Labeled>
          </div>
        )}
      </Section>

      <Section title="Deductions and leave">
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Check testId="sal-absent" label="Deduct pay for absent days" checked={form.absentDeductionEnabled} onChange={(v) => set({ absentDeductionEnabled: v })} />
          <Check testId="sal-unpaid" label="Deduct pay for unpaid leave" checked={form.unpaidLeaveDeductionEnabled} onChange={(v) => set({ unpaidLeaveDeductionEnabled: v })} />
          <Check testId="sal-half" label="Deduct half a day for a half day" checked={form.halfDayDeductionEnabled} onChange={(v) => set({ halfDayDeductionEnabled: v })} />
          <Check testId="sal-late" label="Late arrival deduction" checked={form.lateDeductionEnabled} onChange={(v) => set({ lateDeductionEnabled: v })} />
        </div>
        {form.lateDeductionEnabled && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Labeled label="Free late arrivals per period"><input data-testid="sal-lateallow" type="number" min="0" className={inputCls} value={form.lateAllowedPerPeriod} onChange={(e) => set({ lateAllowedPerPeriod: e.target.value })} /></Labeled>
            <Labeled label="Deduction per extra late (% of a day)"><input data-testid="sal-latepct" type="number" min="1" max="100" className={inputCls} value={form.lateDeductionPercent} onChange={(e) => set({ lateDeductionPercent: e.target.value })} /></Labeled>
          </div>
        )}
        <div>
          <p className="m-0 mb-1.5 text-xs font-semibold text-slate-600">Paid leave policy: these leave types are paid</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">{LEAVE_TYPES.map((l) => <Check key={l} testId={`sal-leave-${l.split(' ')[0]}`} label={l} checked={form.paidLeaveTypes.includes(l)} onChange={() => set({ paidLeaveTypes: toggle(form.paidLeaveTypes, l) })} />)}</div>
          <p className="m-0 mt-1 text-[11px] text-slate-400">Unpaid Leave is never paid.</p>
        </div>
      </Section>

      <Section title="Payment method">
        <div className="grid sm:grid-cols-2 gap-3">
          <Labeled label="Pay by"><select data-testid="sal-method" className={inputCls} value={form.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })}>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Labeled>
          {form.paymentMethod === 'UPI' && <Labeled label="UPI ID"><input data-testid="sal-upi" className={inputCls} placeholder="name@bank" value={form.upiId} onChange={(e) => set({ upiId: e.target.value })} /></Labeled>}
        </div>
        {form.paymentMethod === 'BANK_TRANSFER' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Labeled label="Account holder"><input data-testid="sal-holder" className={inputCls} value={form.bank.accountHolder} onChange={(e) => set({ bank: { ...form.bank, accountHolder: e.target.value } })} /></Labeled>
            <Labeled label="Account number"><input data-testid="sal-acc" inputMode="numeric" className={inputCls} value={form.bank.accountNumber} onChange={(e) => set({ bank: { ...form.bank, accountNumber: e.target.value } })} /></Labeled>
            <Labeled label="IFSC"><input data-testid="sal-ifsc" className={inputCls} placeholder="HDFC0001234" value={form.bank.ifsc} onChange={(e) => set({ bank: { ...form.bank, ifsc: e.target.value.toUpperCase() } })} /></Labeled>
            <Labeled label="Bank name"><input data-testid="sal-bank" className={inputCls} value={form.bank.bankName} onChange={(e) => set({ bank: { ...form.bank, bankName: e.target.value } })} /></Labeled>
          </div>
        )}
        <p className="m-0 text-[11px] text-slate-400">Payments are recorded by an admin after they are made. Nothing is paid automatically.</p>
      </Section>
    </div>
  );
};

/** Optional section inside the employee create form: salary is saved right after the employee. */
export const SalarySection = ({ enabled, setEnabled, form, setForm }) => (
  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4" data-testid="salary-section">
    <label className="flex items-center gap-2 text-sm font-bold text-emerald-900 cursor-pointer">
      <input type="checkbox" data-testid="salary-section-toggle" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Set up salary now (optional)
    </label>
    <p className="m-0 mt-1 text-xs text-emerald-800/70">Salary configuration can also be added or revised later from the Payroll tab or this employee's Salary button.</p>
    {enabled && <div className="mt-3"><SalaryFormFields form={form} setForm={setForm} /></div>}
  </div>
);

/** View, create or revise the salary of one employee. A revision starts a NEW version on its date; earlier versions are kept. */
export const SalaryConfigModal = ({ employee, brandId, onClose, onSaved }) => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [correction, setCorrection] = useState(false);

  useEffect(() => {
    payrollService.getSalary(brandId || employee.brandId, employee.id).then((d) => {
      setData(d);
      if (d.salary) {
        const f = salaryToForm(d.salary);
        const next = new Date(Date.now() + 330 * 60000 + 86400000).toISOString().slice(0, 10);
        setForm({ ...f, effectiveFrom: next, effectiveTo: '' }); // a revision starts from tomorrow unless changed
      } else setForm(emptySalary());
    }).catch((e) => setError(e.message));
  }, [employee.id, employee.brandId, brandId]);

  const save = async () => {
    setBusy(true); setError('');
    try {
      await payrollService.saveSalary(brandId || employee.brandId, employee.id, formToBody(form, { correction }));
      onSaved?.();
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const cur = data?.salary;
  return (
    <Modal title={`Salary: ${employee.name}`} onClose={onClose} wide testId="salary-modal"
      footer={<><button type="button" className={btnGhost} onClick={onClose}>Close</button><button type="button" data-testid="sal-save" disabled={busy || !form} className={btnPrimary} onClick={save}>{busy ? 'Saving…' : cur ? (correction ? 'Save correction' : 'Save as new salary version') : 'Save salary'}</button></>}>
      {!data && !error && <Spinner />}
      {error && <Notice type="error">{error}</Notice>}
      {data && form && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
            <div><p className="m-0 text-[11px] text-slate-500">Employee ID</p><p className="m-0 font-bold" data-testid="sal-empid">{data.employee.employeeId}</p></div>
            <div><p className="m-0 text-[11px] text-slate-500">Employee name</p><p className="m-0 font-bold">{data.employee.name}</p></div>
            <div><p className="m-0 text-[11px] text-slate-500">Department</p><p className="m-0 font-bold">{data.employee.department || '-'}</p></div>
          </div>
          {cur ? (
            <Notice type="info">Current salary (version {cur.version}): {TYPE_LABEL[cur.salaryType]} {fmtMoney(cur.baseAmountPaise)}, paid {FREQ_LABEL[cur.paymentFrequency].toLowerCase()}, from {cur.effectiveFrom}. Changes below start a <b>new version</b> on the date you choose; earlier versions and payrolls stay as they were.
              {data.lockedThrough && <> Payroll exists up to <b>{data.lockedThrough}</b>, so a change must start after that date.</>}</Notice>
          ) : <Notice type="info">No salary is set up for this employee yet.</Notice>}
          {cur && cur.version === 1 && !data.lockedThrough && <Check testId="sal-correction" label="This is a correction of the first entry (no payroll exists yet)" checked={correction} onChange={(v) => { setCorrection(v); if (v) setForm({ ...form, effectiveFrom: cur.effectiveFrom }); }} />}
          <SalaryFormFields form={form} setForm={setForm} />
          {cur && <Labeled label="Reason for the change (kept in the history)"><input data-testid="sal-reason" className={inputCls} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Annual raise" /></Labeled>}
          {data.history.length > 0 && (
            <div>
              <p className="m-0 mb-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">Salary history</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm" data-testid="sal-history">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Ver.</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">From</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Reason</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{data.history.map((h) => <tr key={h.version} data-testid="sal-history-row"><td className="px-3 py-2">{h.version}</td><td className="px-3 py-2">{TYPE_LABEL[h.salaryType]}</td><td className="px-3 py-2 font-semibold">{fmtMoney(h.baseAmountPaise)}</td><td className="px-3 py-2">{h.effectiveFrom}</td><td className="px-3 py-2">{h.effectiveTo || 'Open'}</td><td className="px-3 py-2 text-slate-500">{h.reason}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export { today };
