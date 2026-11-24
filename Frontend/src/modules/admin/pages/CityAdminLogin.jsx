import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import cityAdminService from '../../../services/cityAdminService';
import { useAuth } from '../../../context/AuthContext';

/** Common login page for every City Admin. Which brand and city they get is decided by the server from their account. */
export const CityAdminLogin = () => {
  const navigate = useNavigate();
  const { syncAuthFromStorage, setAdminSessionValid } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [showNew, setShowNew] = useState(false); // eye icon on the "choose your own password" boxes
  const [error, setError] = useState(() => { try { const m = sessionStorage.getItem('savitri_city_admin_notice') || ''; sessionStorage.removeItem('savitri_city_admin_notice'); return m; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [info, setInfo] = useState(null);
  const [sessionToken, setSessionToken] = useState('');

  // Browsers fill saved passwords into login forms. This page asks them not to: the boxes stay read-only until you click into them
  // (Chrome only autofills editable boxes), and anything filled in behind our back is cleared right after the page loads.
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setLogin(''); setPassword(''); }, 400);
    return () => clearTimeout(t);
  }, []);

  const enter = () => { setAdminSessionValid?.(true); syncAuthFromStorage('admin'); navigate('/admin', { replace: true }); };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const d = await cityAdminService.login(login.trim(), password, remember);
      setInfo(d.brand);
      setSessionToken(d.token);
      if (d.mustChangePassword) { setPw({ current: password, next: '', confirm: '' }); setMustChange(true); setBusy(false); return; }
      setPassword('');
      enter();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const change = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await cityAdminService.changePassword({ currentPassword: pw.current, newPassword: pw.next, confirmPassword: pw.confirm }, sessionToken);
      setPw({ current: '', next: '', confirm: '' }); setPassword('');
      enter();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const field = 'w-full bg-[#1A2E0A] border border-[#355A1C] focus:border-[#F7941D] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none';
  return (
    <div className="min-h-screen bg-[#1A2E0A] flex items-center justify-center p-4 font-sans" data-testid="city-login">
      <div className="w-full max-w-md bg-[#0F1C06] border border-[#355A1C] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-md"><img src="/LogoSavitri.png" alt="Savitri" className="h-10 object-contain" /></div>
          <div className="flex items-center justify-center gap-2"><Building2 size={20} className="text-[#F7941D]" /><h1 className="text-xl font-bold text-white m-0">City Admin Login</h1></div>
          <p className="text-xs text-teal-300/70 m-0">Sign in with the email or username your Super Admin gave you</p>
        </div>
        {error && <div role="alert" data-testid="city-error" className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold p-3 rounded-xl flex items-center gap-2"><AlertCircle size={15} className="shrink-0" /><span>{error}</span></div>}

        {!mustChange ? (
          <form onSubmit={submit} className="space-y-4" autoComplete="off">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Email or username</label>
              <div className="relative"><Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-300/60 pointer-events-none" />
                <input data-testid="city-login-id" name="city-admin-id" type="text" required autoComplete="off" readOnly={!unlocked} onFocus={() => setUnlocked(true)} value={login} onChange={(e) => setLogin(e.target.value)} className={`${field} pl-10`} placeholder="you@example.com" /></div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Password</label>
              <div className="relative"><Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-300/60 pointer-events-none" />
                <input data-testid="city-login-password" name="city-admin-secret" type={show ? 'text' : 'password'} required autoComplete="new-password" readOnly={!unlocked} onFocus={() => setUnlocked(true)} value={password} onChange={(e) => setPassword(e.target.value)} className={`${field} pl-10 pr-11`} placeholder="Enter password" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-300/70 bg-transparent border-none cursor-pointer">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4" /><span className="text-xs font-medium text-slate-300">Remember me for 30 days</span></label>
            <button type="submit" data-testid="city-login-submit" disabled={busy} className="w-full bg-[#79B433] hover:bg-[#689A2B] text-white font-bold py-3.5 rounded-xl text-sm border-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <><Loader2 size={18} className="animate-spin" /><span>Signing in...</span></> : <><span>Sign in</span><ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={change} className="space-y-4" data-testid="city-change">
            <p className="m-0 text-sm text-teal-200">Welcome{info?.name ? ` to ${info.name}` : ''}. You signed in with a temporary password. Please choose your own password to continue.</p>
            {[['city-new', 'next', 'New password (8+ characters, letters and a number)'], ['city-confirm', 'confirm', 'Confirm new password']].map(([id, key, ph]) => (
              <div className="relative" key={id}>
                <input data-testid={id} type={showNew ? 'text' : 'password'} autoComplete="new-password" required value={pw[key]} onChange={(e) => setPw({ ...pw, [key]: e.target.value })} className={`${field} pr-11`} placeholder={ph} />
                <button type="button" data-testid={`${id}-eye`} onClick={() => setShowNew(!showNew)} aria-label={showNew ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-300/70 bg-transparent border-none cursor-pointer">{showNew ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            ))}
            <button type="submit" data-testid="city-change-submit" disabled={busy} className="w-full bg-[#79B433] text-white font-bold py-3.5 rounded-xl text-sm border-0 cursor-pointer disabled:opacity-60">{busy ? 'Saving...' : 'Set password and continue'}</button>
          </form>
        )}
        <div className="text-center pt-2 border-t border-[#355A1C]/50"><p className="text-[11px] text-teal-300/50 font-mono m-0">Savitri City Admin Gateway</p></div>
      </div>
    </div>
  );
};

export default CityAdminLogin;
