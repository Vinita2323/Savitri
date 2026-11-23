import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import LiveCamera from './LiveCamera';
import { Notice, btnGhost } from './ui';

// Answers that mean "this is no longer needed / not possible", not "try the photo again"
const FINAL_CODES = ['ALREADY_DONE', 'NOT_REQUIRED', 'NOTHING_DUE', 'TOO_EARLY', 'LOGIN_FIRST', 'DISABLED'];

/**
 * Capture a live photo and send it. type: 'LOGIN' | 'PERIODIC'.
 * onDone(result | null) is called after success (result) or when the server says there is nothing to do (null).
 */
export default function SelfieCapture({ type, onDone }) {
  const [phase, setPhase] = useState('camera'); // camera | uploading | error | done
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [camKey, setCamKey] = useState(0);
  const [result, setResult] = useState(null);

  const submit = async (blob, meta) => {
    setPhase('uploading');
    setProgress(0);
    setError(null);
    try {
      const res = await employeePortalService.submitSelfie(type, blob, meta, setProgress);
      setResult(res);
      setPhase('done');
      window.dispatchEvent(new Event('employee-selfie-changed'));
      window.dispatchEvent(new Event('employee-notifications-changed'));
      setTimeout(() => onDone?.(res), 1500);
    } catch (e) {
      setError(e);
      setPhase('error');
      if (FINAL_CODES.includes(e.code)) window.dispatchEvent(new Event('employee-selfie-changed'));
    }
  };

  if (phase === 'done') {
    return (
      <div data-testid="selfie-done" className="text-center py-10">
        <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
        <h3 className="text-xl font-extrabold text-slate-900 mt-3 mb-1">Selfie submitted</h3>
        <p className="text-sm text-slate-500 m-0">
          {result?.nextDueAt ? `Your next verification is due at ${new Date(result.nextDueAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}.` : 'Thank you. It has been recorded.'}
        </p>
      </div>
    );
  }

  if (phase === 'uploading') {
    return (
      <div data-testid="selfie-uploading" className="py-12 text-center space-y-3">
        <Loader2 className="w-10 h-10 mx-auto text-emerald-600 animate-spin" />
        <p className="text-base font-bold text-slate-900 m-0">Uploading your selfie… {progress}%</p>
        <div className="max-w-xs mx-auto h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {phase === 'error' && (
        <div data-testid="selfie-error" className="space-y-3">
          <Notice type="error">{error?.message || 'Could not submit your selfie.'}</Notice>
          {FINAL_CODES.includes(error?.code) ? (
            <div className="text-center"><button type="button" className={btnGhost} onClick={() => onDone?.(null)}>Close</button></div>
          ) : null}
        </div>
      )}
      {!(phase === 'error' && FINAL_CODES.includes(error?.code)) && (
        <LiveCamera key={camKey} onCaptured={submit} confirmLabel={type === 'LOGIN' ? 'Submit login selfie' : 'Submit selfie'} />
      )}
      {phase === 'error' && !FINAL_CODES.includes(error?.code) && (
        <p className="text-center text-xs text-slate-400 m-0"><button type="button" className="underline bg-transparent border-0 cursor-pointer text-slate-500" onClick={() => { setPhase('camera'); setCamKey((k) => k + 1); }}>Start over with a new photo</button></p>
      )}
    </div>
  );
}
