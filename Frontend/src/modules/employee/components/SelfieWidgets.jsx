import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Bell, Camera, Clock, Loader2 } from 'lucide-react';
import { useSelfie } from '../context/SelfieContext';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import SelfieCapture from './SelfieCapture';
import { Badge, Card, Notice, Spinner, btnGhost, btnPrimary, fmtDate, fmtTime } from './ui';
import { getFCMToken, requestNotificationPermission } from '../../../services/pushNotificationService';
import employeePortalService from '../../../services/employeePortalService';

export const STATUS_META = {
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  DUE_SOON: { label: 'Due Soon', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  OVERDUE: { label: 'Overdue', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  MISSED: { label: 'Missed', cls: 'bg-rose-100 text-rose-800 border-rose-300' },
  NOT_REQUIRED: { label: 'Not required today', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const StatusChip = ({ status, testId = 'selfie-chip' }) => {
  const m = STATUS_META[status] || STATUS_META.PENDING;
  return <span data-testid={testId} data-status={status} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${m.cls}`}>{m.label}</span>;
};

const REASONS = { WEEKLY_OFF: 'Weekly off', HOLIDAY: 'Holiday', LEAVE: 'On approved leave', DISABLED: 'Selfie verification is off for your brand' };

/** "in 12 min" / "5 min ago" relative to the server clock */
export const relative = (iso, nowMs) => {
  if (!iso) return '';
  const diff = Math.round((new Date(iso).getTime() - nowMs) / 60000);
  const abs = Math.abs(diff);
  const text = abs >= 60 ? `${Math.floor(abs / 60)} hr ${abs % 60 ? `${abs % 60} min` : ''}`.trim() : `${abs} min`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
};

/** Modal wrapper for the capture flow (used by the dashboard card, the banner and the selfie page). */
export const CaptureModal = ({ type, onClose }) => (
  <div data-testid="capture-modal" className="fixed inset-0 z-[80] bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 max-h-[94dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 m-0">{type === 'LOGIN' ? 'Login selfie' : 'Selfie verification'}</h2>
          <p className="text-sm text-slate-500 mt-0.5 mb-0">Take a live photo with your camera.</p>
        </div>
        <button type="button" onClick={onClose} className={btnGhost} aria-label="Close">✕</button>
      </div>
      <SelfieCapture type={type} onDone={onClose} />
    </div>
  </div>
);

/** Turn on background reminders (push). Needs the browser's notification permission. */
export const EnableNotifications = () => {
  const [perm, setPerm] = useState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    // already allowed: quietly make sure this device is registered
    if (perm === 'granted') getFCMToken().then((t) => t && employeePortalService.registerPush(t)).catch(() => {});
  }, [perm]);
  if (perm === 'unsupported' || perm === 'granted') return perm === 'granted' ? <p data-testid="push-on" className="m-0 text-xs text-emerald-700 font-semibold flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Reminders are on for this device</p> : null;
  const enable = async () => {
    setBusy(true); setMsg('');
    try {
      const ok = await requestNotificationPermission();
      setPerm(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
      if (!ok) { setMsg('Notifications are blocked. Allow them in your browser settings to get reminders when the app is closed.'); return; }
      const token = await getFCMToken();
      if (token) await employeePortalService.registerPush(token);
    } finally { setBusy(false); }
  };
  return (
    <div>
      <button type="button" data-testid="push-enable" onClick={enable} disabled={busy} className="text-xs font-bold text-emerald-700 hover:underline bg-transparent border-0 p-0 cursor-pointer inline-flex items-center gap-1.5">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />} Turn on reminders for this device</button>
      {msg && <p className="m-0 mt-1 text-xs text-amber-700">{msg}</p>}
    </div>
  );
};

const Row = ({ label, value, testId }) => (
  <div className="bg-slate-50 rounded-xl px-3 py-2">
    <p className="text-[10px] font-semibold text-slate-500 m-0 uppercase tracking-wide">{label}</p>
    <p data-testid={testId} className="text-sm font-extrabold text-slate-900 mt-0.5 mb-0">{value}</p>
  </div>
);

/** "Selfie Verification" section of the Employee dashboard / selfie page. */
export const SelfieSummaryCard = ({ showHistoryLink = true, onCapture }) => {
  const { status, loaded, error, nowMs } = useSelfie();
  const [modal, setModal] = useState(null);
  if (!loaded) return <Card title="Selfie Verification"><Spinner /></Card>;
  if (!status) return <Card title="Selfie Verification"><Notice type="error">{error || 'Could not load your selfie status.'}</Notice></Card>;
  if (status.enabled === false) return null;

  const open = (t) => { if (onCapture) onCapture(t); else setModal(t); };
  const loginDone = status.loginSelfie?.status === 'COMPLETED';
  const loginText = !status.required ? '—' : loginDone ? `Done · ${fmtTime(status.loginSelfie.capturedAt)}` : status.currentStatus === 'MISSED' ? 'Missed' : 'Pending';
  const next = status.nextDueAt;
  const blockedHint = !status.required ? `No selfie needed today (${REASONS[status.reason] || 'day off'}).`
    : !status.canCapture && next ? `Opens ${Math.round(status.config.earlyMinutes)} min before it is due at ${fmtTime(next)}.`
    : !status.canCapture ? 'Nothing is due right now.' : '';

  return (
    <section data-testid="selfie-card" className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2"><Camera className="w-4 h-4 text-emerald-600" /> Selfie Verification</p>
        <StatusChip status={status.currentStatus} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5">
        <Row label="Today's login selfie" value={loginText} testId="selfie-login" />
        <Row label="Last selfie" value={status.lastSubmissionAt ? fmtTime(status.lastSubmissionAt) : '—'} testId="selfie-last" />
        <Row label="Next due" value={next ? `${fmtTime(next)} (${relative(next, nowMs())})` : '—'} testId="selfie-next" />
        <Row label="Selfies today" value={status.totalToday} testId="selfie-total" />
        <Row label="Missed today" value={status.missedToday} testId="selfie-missed" />
      </div>
      <button type="button" data-testid="selfie-capture-btn" disabled={!status.canCapture} onClick={() => open(status.captureType)} className={`${btnPrimary} mt-3 w-full`}>
        <Camera className="w-5 h-5" /> Capture Live Selfie
      </button>
      {blockedHint && <p data-testid="selfie-hint" className="text-[11px] text-slate-500 mt-2 mb-0 text-center">{blockedHint}</p>}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <EnableNotifications />
        {showHistoryLink && <Link to="/employee/selfie" data-testid="selfie-history-link" className="text-xs font-bold text-emerald-700 no-underline hover:underline">View my selfie history →</Link>}
      </div>
      {modal && <CaptureModal type={modal} onClose={() => setModal(null)} />}
    </section>
  );
};

/** Prominent reminder on every employee page while a selfie is due, overdue or missed. */
export const SelfieReminderBanner = () => {
  const { status, nowMs } = useSelfie();
  const loc = useLocation();
  if (!status?.required || loc.pathname.startsWith('/employee/selfie')) return null;
  const s = status.currentStatus;
  if (!['DUE_SOON', 'OVERDUE', 'MISSED'].includes(s)) return null;
  if (s !== 'MISSED' && !status.canCapture) return null;
  const overdue = s === 'OVERDUE' || s === 'MISSED';
  const next = status.nextDueAt;
  const text = s === 'OVERDUE' ? `Your selfie verification is overdue${status.nextGraceUntil ? ` — it will be marked missed at ${fmtTime(status.nextGraceUntil)}` : ''}.`
    : s === 'MISSED' ? (status.canCapture ? 'You missed a selfie verification. Please verify now.' : `You missed a selfie verification. Your next one is due ${next ? relative(next, nowMs()) : 'later today'} (${fmtTime(next)}).`)
    : `Your selfie verification is due ${next ? relative(next, nowMs()) : 'soon'} (${fmtTime(next)}).`;
  return (
    <div data-testid="selfie-banner" data-status={s} role="alert" className={`mb-4 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${overdue ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
      {overdue ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Clock className="w-5 h-5 shrink-0" />}
      <p className="m-0 text-sm font-semibold flex-1 min-w-[200px]">{text}</p>
      {status.canCapture && <Link to="/employee/selfie?capture=1" data-testid="selfie-banner-btn" className={`${btnPrimary} no-underline ${overdue ? '!bg-rose-600 hover:!bg-rose-700' : ''}`}><Camera className="w-4 h-4" /> Capture Live Selfie</Link>}
    </div>
  );
};

/** Full-screen, cannot-be-skipped login selfie (shown instead of the app until it is done). */
export const SelfieGate = ({ onLogout }) => {
  const { employee } = useEmployeeAuth();
  const { refresh, status } = useSelfie();
  return (
    <div data-testid="selfie-gate" className="fixed inset-0 z-[90] bg-slate-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-lg p-6 sm:p-8">
          <img src="/LogoSavitri.png" alt="" className="h-10 mx-auto mb-3 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <h1 className="text-xl font-extrabold text-slate-900 text-center m-0">Hi {employee?.fullName?.split(' ')[0]}, start your day</h1>
          <p className="text-sm text-slate-500 text-center mt-1.5 mb-5">Take a live login selfie to open your dashboard. {status?.currentStatus === 'MISSED' ? 'It is now late, but you can still submit it.' : ''}</p>
          <SelfieCapture type="LOGIN" onDone={() => refresh()} />
          <p className="text-center mt-5 mb-0"><button type="button" onClick={onLogout} className="text-xs font-semibold text-slate-500 underline bg-transparent border-0 cursor-pointer">Log out</button></p>
        </div>
      </div>
    </div>
  );
};

/** Shown while the first status is loading or if it cannot be loaded: the app is not opened without knowing. */
export const SelfieChecking = ({ error, onRetry, onLogout }) => (
  <div data-testid="selfie-checking" className="fixed inset-0 z-[90] bg-slate-50 flex items-center justify-center p-4">
    {error ? (
      <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3">
        <Notice type="error">{error}</Notice>
        <div className="flex justify-center gap-2"><button type="button" className={btnPrimary} onClick={onRetry}>Try again</button><button type="button" className={btnGhost} onClick={onLogout}>Log out</button></div>
      </div>
    ) : <Spinner label="Checking today's verification…" />}
  </div>
);

export const dayLabel = (ds) => fmtDate(`${ds}T12:00:00+05:30`);
export { Badge };
