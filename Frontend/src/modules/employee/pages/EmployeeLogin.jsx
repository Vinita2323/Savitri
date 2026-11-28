import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { Field, Notice, btnPrimary, inputCls } from '../components/ui';

export default function EmployeeLogin() {
  const { login, isAuthenticated, checking } = useEmployeeAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const justRegistered = location.state?.registered;
  const passwordReset = location.state?.passwordReset;

  if (!checking && isAuthenticated) return <Navigate to="/employee/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password) {
      setError('Enter your email or mobile number and your password.');
      return;
    }
    setBusy(true);
    try {
      await login(identifier.trim(), password);
      const back = sessionStorage.getItem('savitri_employee_auth_expired_redirect');
      sessionStorage.removeItem('savitri_employee_auth_expired_redirect');
      navigate(back && back.startsWith('/employee/') ? back : '/employee/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg p-7 sm:p-9">
        <div className="text-center mb-7">
          <img src="/LogoSavitri.png" alt="Savitri" className="h-12 mx-auto mb-3 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h1 className="text-2xl font-extrabold text-slate-900 m-0">Employee Login</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-0">Sign in to mark attendance and manage your tasks</p>
        </div>

        {justRegistered && <div className="mb-4"><Notice type="success">Registration submitted. You can log in once an administrator approves your account.</Notice></div>}
        {passwordReset && !error && <div className="mb-4" data-testid="emp-reset-done"><Notice type="success">{passwordReset}</Notice></div>}
        {error && <div className="mb-4"><Notice type="error">{error}</Notice></div>}

        <form onSubmit={submit} className="space-y-4" noValidate autoComplete="off">
          <Field label="Email or mobile number">
            <input className={inputCls} value={identifier} onChange={(e) => setIdentifier(e.target.value)} name="employee-login-id" autoComplete="off" placeholder="you@company.com or 98XXXXXXXX" autoFocus />
          </Field>
          <Field label={<span className="flex items-center justify-between gap-2"><span>Password</span><Link to="/employee/forgot-password" data-testid="emp-forgot-link" className="text-xs font-semibold text-emerald-700 hover:underline">Forgot password?</Link></span>}>
            <div className="relative">
              <input className={`${inputCls} pr-11`} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} name="employee-login-secret" autoComplete="new-password" placeholder="Your password" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-0" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </Field>
          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
            <LogIn className="w-4.5 h-4.5" /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6 mb-0">
          New employee? <Link to="/employee/register" className="font-semibold text-emerald-700 hover:underline">Register here</Link>
        </p>
        <p className="text-center text-xs text-slate-400 mt-3 mb-0">Attendance is recorded automatically when you sign in.</p>
      </div>
    </div>
  );
}
