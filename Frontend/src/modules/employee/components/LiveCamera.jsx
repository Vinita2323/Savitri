import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Check, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { btnGhost, btnPrimary } from './ui';

const MAX_ATTEMPTS = 3; // controlled retry: after this many failures the employee is shown how to fix the browser setting
const COOLDOWN_SECONDS = 3;
const MAX_WIDTH = 960;

const PROBLEMS = {
  DENIED: { title: 'Camera permission is blocked', text: 'Allow camera access for this site: tap the lock / camera icon next to the address bar, choose "Allow" for Camera, then try again.' },
  NO_CAMERA: { title: 'No camera found', text: 'This device has no usable camera. Use a phone or laptop with a front camera.' },
  IN_USE: { title: 'The camera is busy', text: 'Another app or browser tab is using the camera. Close it and try again.' },
  INSECURE: { title: 'A secure connection is needed', text: 'The camera only works on a secure (HTTPS) page. Open the portal using its https:// address.' },
  ERROR: { title: 'The camera could not be started', text: 'Something went wrong while opening the camera. Please try again.' },
};

const classify = (err) => {
  const n = err?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return 'DENIED';
  if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return 'NO_CAMERA';
  if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'IN_USE';
  return 'ERROR';
};

/**
 * Live camera capture. There is deliberately NO file picker / gallery option: the photo can only come from
 * the camera stream. (A browser cannot prove a photo is genuine; this removes the easy shortcut of choosing an old picture.)
 * onCaptured(blob, meta) is called when the employee confirms the photo.
 */
export default function LiveCamera({ onCaptured, disabled = false, confirmLabel = 'Use this photo' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [state, setState] = useState('starting'); // starting | live | problem
  const [problem, setProblem] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [shot, setShot] = useState(null); // { blob, url }
  const [label, setLabel] = useState('');
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    setReady(false);
    setState('starting');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setProblem('INSECURE'); setState('problem'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      setLabel(stream.getVideoTracks()[0]?.label || '');
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setAttempts(0);
      setState('live');
    } catch (err) {
      setProblem(classify(err));
      setAttempts((a) => a + 1);
      setCooldown(COOLDOWN_SECONDS);
      setState('problem');
    }
  }, [stop]);

  useEffect(() => { start(); return () => stop(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => () => { if (shot?.url) URL.revokeObjectURL(shot.url); }, [shot]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_WIDTH / v.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      stop(); // free the camera as soon as the picture is taken
      setShot({ blob, url: URL.createObjectURL(blob), at: new Date() });
    }, 'image/jpeg', 0.85);
  };

  const retake = () => { setShot(null); start(); };
  const confirm = () => {
    if (!shot) return;
    onCaptured(shot.blob, {
      capturedAt: shot.at.toISOString(),
      deviceInfo: {
        userAgent: navigator.userAgent, platform: navigator.platform || '', language: navigator.language || '',
        screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`, cameraLabel: label, captureMethod: 'live-camera',
      },
    });
  };

  if (state === 'problem') {
    const info = PROBLEMS[problem] || PROBLEMS.ERROR;
    const exhausted = attempts >= MAX_ATTEMPTS;
    return (
      <div data-testid="cam-problem" data-problem={problem} className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <CameraOff className="w-12 h-12 mx-auto text-rose-500" />
        <h3 className="text-lg font-extrabold text-rose-900 mt-3 mb-1">{info.title}</h3>
        <p className="text-[15px] text-rose-800 m-0">{info.text}</p>
        {exhausted && problem !== 'INSECURE' && problem !== 'NO_CAMERA' ? (
          <div className="mt-4 space-y-3">
            <p data-testid="cam-exhausted" className="m-0 text-sm font-semibold text-rose-900"><ShieldAlert className="w-4 h-4 inline -mt-0.5" /> Still not working after {MAX_ATTEMPTS} tries. Fix the camera setting in your browser, then reload this page.</p>
            <button type="button" data-testid="cam-reload" className={btnPrimary} onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4" /> Reload page</button>
          </div>
        ) : problem === 'INSECURE' || problem === 'NO_CAMERA' ? null : (
          <button type="button" data-testid="cam-retry" className={`${btnPrimary} mt-4`} disabled={cooldown > 0} onClick={start}>
            <RefreshCw className="w-4 h-4" /> {cooldown > 0 ? `Try again in ${cooldown}s` : `Try again (${attempts}/${MAX_ATTEMPTS})`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-md aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900">
        <video
          ref={videoRef}
          data-testid="cam-video"
          muted
          playsInline
          autoPlay
          onLoadedData={() => setReady(true)}
          className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${shot ? 'hidden' : ''}`}
        />
        {shot && <img data-testid="cam-preview" src={shot.url} alt="Your selfie" className="absolute inset-0 w-full h-full object-cover -scale-x-100" />}
        {state === 'starting' && !shot && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2"><Loader2 className="w-8 h-8 animate-spin" /><p className="m-0 text-sm font-semibold">Starting the camera… allow access if asked</p></div>
        )}
        {state === 'live' && !shot && (
          <div className="absolute inset-x-0 top-0 p-3 text-center"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-black/50 rounded-full px-3 py-1"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Live camera</span></div>
        )}
      </div>
      <p className="text-center text-sm text-slate-500 m-0">Face the camera in good light. Photos from the gallery are not accepted.</p>
      <div className="flex justify-center gap-3">
        {shot ? (
          <>
            <button type="button" data-testid="cam-retake" className={btnGhost} onClick={retake} disabled={disabled}><RefreshCw className="w-4 h-4" /> Retake</button>
            <button type="button" data-testid="cam-confirm" className={btnPrimary} onClick={confirm} disabled={disabled}>{disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {confirmLabel}</button>
          </>
        ) : (
          <button type="button" data-testid="cam-capture" className={btnPrimary} onClick={capture} disabled={state !== 'live' || !ready || disabled}><Camera className="w-5 h-5" /> Capture photo</button>
        )}
      </div>
    </div>
  );
}
