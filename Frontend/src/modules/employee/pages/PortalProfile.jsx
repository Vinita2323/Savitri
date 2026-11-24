import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import employeePortalService, { employeeSession } from '../../../services/employeePortalService';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { Card, Field, Notice, btnPrimary, fmtDate, inputCls } from '../components/ui';

const Row = ({ label, value }) => (
  <div><p className="text-xs text-slate-500 font-semibold m-0 uppercase tracking-wide">{label}</p><p className="text-sm font-semibold text-slate-900 m-0 mt-1 break-words">{value || '—'}</p></div>
);

export default function PortalProfile() {
  const { employee, setEmployee, logout } = useEmployeeAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: employee?.phone || '', address: employee?.address || '', city: employee?.city || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [pwError, setPwError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setMsg(''); setError(''); setBusy(true);
    try {
      const emp = await employeePortalService.updateMe(form);
      setEmployee(emp);
      employeeSession.save(employeeSession.getToken(), emp);
      setMsg('Profile updated.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.newPassword !== pw.confirm) return setPwError('Passwords do not match.');
    setBusy(true);
    try {
      await employeePortalService.changePassword(pw.currentPassword, pw.newPassword);
      await logout();
      navigate('/employee/login', { replace: true });
    } catch (err) { setPwError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-[22px] sm:text-2xl font-extrabold text-slate-900 m-0 leading-tight">My Profile</h1>
      <Card title="Employment details (managed by your administrator)">
        <div className="grid sm:grid-cols-3 gap-5">
          <Row label="Name" value={employee?.fullName} /><Row label="Employee ID" value={employee?.employeeId} /><Row label="Email" value={employee?.email} />
          <Row label="Department" value={employee?.department} /><Row label="Designation" value={employee?.designation} /><Row label="Brand" value={employee?.brandName} />
          <Row label="Joining date" value={fmtDate(employee?.joiningDate)} /><Row label="Gender" value={employee?.gender} /><Row label="Date of birth" value={employee?.dateOfBirth ? fmtDate(employee.dateOfBirth) : ''} />
        </div>
      </Card>

      <Card title="Contact details">
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-4">
          <Field label="Mobile number"><input className={inputCls} inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} /></Field>
          <Field label="City"><input className={inputCls} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><textarea className={inputCls} rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></Field></div>
          <div className="sm:col-span-2 space-y-3">
            {msg && <Notice type="success">{msg}</Notice>}{error && <Notice type="error">{error}</Notice>}
            <button type="submit" className={btnPrimary} disabled={busy}>Save changes</button>
          </div>
        </form>
      </Card>

      <Card title="Change password">
        <form onSubmit={changePw} className="grid sm:grid-cols-3 gap-4">
          <Field label="Current password"><input className={inputCls} type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} /></Field>
          <Field label="New password" hint="8+ characters, a letter and a number"><input className={inputCls} type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} /></Field>
          <Field label="Confirm new password"><input className={inputCls} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} /></Field>
          <div className="sm:col-span-3 space-y-3">
            {pwError && <Notice type="error">{pwError}</Notice>}
            <button type="submit" className={btnPrimary} disabled={busy || !pw.currentPassword || !pw.newPassword}>Update password</button>
            <p className="text-xs text-slate-400 m-0">You will be signed out on every device after changing your password.</p>
          </div>
        </form>
      </Card>
      <button type="button" onClick={async () => { await logout(); navigate('/employee/login', { replace: true }); }} className="w-full h-12 inline-flex items-center justify-center gap-2 text-base font-bold text-rose-600 bg-white border-2 border-rose-200 rounded-2xl active:bg-rose-50 cursor-pointer lg:hidden">Log out</button>
    </div>
  );
}
