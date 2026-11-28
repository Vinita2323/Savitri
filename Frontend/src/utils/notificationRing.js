/**
 * The notification ring used across the apps: the same sound a captain hears for a new delivery request.
 *
 * Browsers only play sound after the person has interacted with the page once, so the first click / tap / key press
 * "unlocks" audio for the rest of the visit. If playing is still refused, a short chime is tried instead.
 */
export const RING_SRC = '/DeliveryAppRing.mpeg';

let audio = null;
let stopTimer = null;
let unlocked = false;

const chime = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35].forEach((at) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + at);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + at + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.3);
    });
  } catch { /* no audio on this device */ }
};

const getAudio = () => {
  if (!audio) {
    audio = new Audio(RING_SRC);
    audio.preload = 'auto';
  }
  return audio;
};

/** Call once: the first user interaction prepares the ring so it can play later without another tap. */
export const unlockRingOnFirstInteraction = () => {
  if (unlocked || typeof window === 'undefined') return;
  const unlock = () => {
    unlocked = true;
    ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.removeEventListener(e, unlock, true));
    try {
      const a = getAudio();
      if (!a.paused) return; // already ringing
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
    } catch { /* ignore */ }
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => window.addEventListener(e, unlock, true));
};

export const isRinging = () => Boolean(audio && !audio.paused && !audio.muted);

/** Plays the ring, repeating it until stopRing() or until maxMs has passed. Does nothing while it is already ringing. */
export const playRing = ({ maxMs = 30000 } = {}) => {
  if (typeof window === 'undefined' || isRinging()) return;
  try {
    const a = getAudio();
    a.muted = false;
    a.loop = true;
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => chime());
  } catch {
    chime();
  }
  clearTimeout(stopTimer);
  stopTimer = setTimeout(stopRing, maxMs);
};

export const stopRing = () => {
  clearTimeout(stopTimer);
  stopTimer = null;
  if (!audio) return;
  try {
    audio.pause();
    audio.loop = false;
    audio.currentTime = 0;
  } catch { /* ignore */ }
};
