import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import employeePortalService from '../../../services/employeePortalService';

const SelfieContext = createContext(null);

/**
 * Today's selfie-verification status for the signed-in employee. The server decides everything (what is due, when it is
 * missed); this only refreshes it often, when the tab becomes visible again, and right after a selfie is sent.
 */
export const SelfieProvider = ({ children }) => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [, setTick] = useState(0);
  const offset = useRef(0); // server clock minus this device's clock

  const refresh = useCallback(async () => {
    try {
      const d = await employeePortalService.selfieStatus();
      offset.current = d.now ? new Date(d.now).getTime() - Date.now() : 0;
      setStatus(d);
      setError('');
    } catch (e) {
      setError(e.message || 'Could not check your selfie status.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 30000);
    const tick = setInterval(() => setTick((n) => n + 1), 15000); // keeps "due in 12 min" fresh
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('employee-selfie-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(poll); clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('employee-selfie-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  const nowMs = useCallback(() => Date.now() + offset.current, []);
  const needsAction = Boolean(status?.required && status?.canCapture && (status.loginRequired || ['OVERDUE', 'DUE_SOON'].includes(status.currentStatus)));
  const value = useMemo(() => ({ status, error, loaded, refresh, nowMs, needsAction }), [status, error, loaded, refresh, nowMs, needsAction]);
  return <SelfieContext.Provider value={value}>{children}</SelfieContext.Provider>;
};

export const useSelfie = () => {
  const ctx = useContext(SelfieContext);
  if (!ctx) throw new Error('useSelfie must be used inside SelfieProvider');
  return ctx;
};
