import { io } from 'socket.io-client';
import { getBaseApiUrl } from './api';

const TOKEN_KEYS = {
  admin: ['shippnex_super_admin_token', 'shippnex_admin_token'],
  seller: ['shippnex_seller_token'],
  captain: ['shippnex_captain_token'],
};

const readToken = (role) => {
  for (const key of TOKEN_KEYS[role] || []) {
    const v = localStorage.getItem(key);
    if (v && v !== 'null' && v !== 'undefined') return v.trim();
  }
  return null;
};

/**
 * Real-time feed. The server sends only content-free pings ("something changed");
 * pages refetch through the normal, authorised, brand-scoped REST APIs.
 * role: 'admin' | 'seller' | 'captain'. Returns an unsubscribe function.
 */
export const subscribeRealtime = (role, events, onEvent, onStatus) => {
  const token = readToken(role);
  if (!token) return () => {};

  const origin = getBaseApiUrl().replace(/\/api\/?$/, '') || 'http://localhost:5000';
  const socket = io(origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    // If the WebSocket cannot be opened (proxy / firewall), continue with HTTP long-polling instead of giving up.
    tryAllTransports: true,
    reconnection: true,
    reconnectionDelay: 1500,
  });
  socket.on('connect', () => onStatus?.(true));
  socket.on('disconnect', () => onStatus?.(false));
  socket.on('connect_error', () => onStatus?.(false));
  events.forEach((ev) => socket.on(ev, (payload) => onEvent?.(ev, payload)));

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
};

// Admin / super admin dashboards: ledger and payout changes.
export const subscribeLedgerChanges = (onChange, onStatus) =>
  subscribeRealtime('admin', ['ledger:changed', 'payout:changed'], (_ev, payload) => onChange?.(payload), onStatus);
