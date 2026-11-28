import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, Send } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { Field, Notice, btnGhost, btnPrimary, inputCls } from '../components/ui';

const PASSWORD_OK = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/**
 * Forgot password: 1) email or mobile number -> a 6-digit code is sent by SMS to the registered mobile number;
 * 2) code + new password. Afterwards every device is signed out and the employee signs in with the new password.
 */
export default function EmployeeForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('ask'); // ask | reset
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0); // seconds before another code may be requested

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');
    if (!identifier.trim()) { setError('Enter the email or mobile number you sign in with.'); return; }
    setBusy(true);
    try {
      const res = await employeePortalService.forgotPassword(identifier.trim());
      setInfo(res.message);
      setWait(res.resendAfterSeconds || 60);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from the SMS.'); return; }
    if (!PASSWORD_OK(password)) { setError('New password must be at least 8 characters and include a letter and a number.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const res = await employeePortalService.resetPassword(identifier.trim(), code.trim(), password);
      navigate('/employee/login', { replace: true, state: { passwordReset: res.message } });
    } catch (err) {
      setError(err.message);
      if (err.code === 'CODE_INVALID') setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg p-7 sm:p-9" data-testid="emp-forgot">
        <div className="text-center mb-6">
          <img src="/LogoSavitri.png" alt="Savitri" className="h-12 mx-auto mb-3 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h1 className="text-2xl font-extrabold text-slate-900 m-0">Forgot password</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-0">
            {step === 'ask' ? 'We will send a 6-digit code by SMS to your registered mobile number.' : 'Enter the code from the SMS and choose a new password.'}
          </p>
        </div>

        {error && <div className="mb-4" data-testid="emp-forgot-error"><Notice type="error">{error}</Notice></div>}
        {info && step === 'reset' && <div className="mb-4" data-testid="emp-forgot-info"><Notice type="success">{info}</Notice></div>}

        {step === 'ask' ? (
          <form onSubmit={sendCode} className="space-y-4" noValidate autoComplete="off">
            <Field label="Email or mobile number">
              <input data-testid="emp-forgot-id" className={inputCls} value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="off" placeholder="you@company.com or 98XXXXXXXX" autoFocus />
            </Field>
            <button type="submit" data-testid="emp-forgot-send" className={`${btnPrimary} w-full`} disabled={busy}>
              <Send className="w-4.5 h-4.5" /> {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4" noValidate autoComplete="off">
            <Field label="6-digit code">
              <input data-testid="emp-forgot-code" className={`${inputCls} tracking-[0.4em] text-center font-bold`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" autoFocus />
            </Field>
            <Field label="New password" hint="At least 8 characters, with a letter and a number.">
              <div className="relative">
                <input data-testid="emp-forgot-new" className={`${inputCls} pr-11`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </Field>
            <Field label="Confirm new password">
              <input data-testid="emp-forgot-confirm" className={inputCls} type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </Field>
            <button type="submit" data-testid="emp-forgot-save" className={`${btnPrimary} w-full`} disabled={busy}>
              <KeyRound className="w-4.5 h-4.5" /> {busy ? 'Saving…' : 'Set new password'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" className={`${btnGhost} !px-3 !py-1.5`} onClick={() => { setStep('ask'); setCode(''); setError(''); setInfo(''); }}>Change number / email</button>
              <button type="button" data-testid="emp-forgot-resend" className="font-semibold text-emerald-700 bg-transparent border-0 cursor-pointer disabled:text-slate-400 disabled:cursor-not-allowed" disabled={busy || wait > 0} onClick={sendCode}>
                {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 mt-6 mb-0">
          <Link to="/employee/login" className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"><ArrowLeft className="w-4 h-4" /> Back to login</Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-3 mb-0">No access to your registered mobile number? Ask your administrator to reset your password.</p>
      </div>
    </div>
  );
}
