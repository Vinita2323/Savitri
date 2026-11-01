import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_ALGORITHMS } from '../utils/jwtConfig.js';
import Admin from '../models/Admin.model.js';
import Seller from '../models/Seller.model.js';
import Captain from '../models/Captain.model.js';

let io = null;

/**
 * Initialize Socket.IO on the HTTP server.
 * Customers join room `user:<userId>` after JWT auth.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, origin || true),
      credentials: true,
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS });
      const role = String(decoded?.role || '').replace(/-/g, '_');
      if (!decoded?.id || !['user', 'seller', 'captain', 'admin', 'super_admin'].includes(role)) {
        return next(new Error('Forbidden'));
      }

      // Admin / super admin sockets: the account must still exist, be active and keep the same role.
      if (role === 'seller' || role === 'captain') {
        const exists = await (role === 'seller' ? Seller : Captain).exists({ _id: decoded.id });
        if (!exists) return next(new Error('Forbidden'));
      }

      if (role === 'admin' || role === 'super_admin') {
        const admin = await Admin.findById(decoded.id).select('role status tokenVersion').lean();
        const active = admin && (!admin.status || admin.status === 'active');
        const sameRole = admin && String(admin.role).replace(/-/g, '_') === role;
        const sameVersion = admin && Number(admin.tokenVersion || 0) === Number(decoded.tokenVersion || 0);
        if (!active || !sameRole || !sameVersion) return next(new Error('Forbidden'));
      }

      socket.userId = String(decoded.id);
      socket.userRole = role;
      return next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.userRole === 'user') {
      socket.join(`user:${socket.userId}`);
    } else if (socket.userRole === 'seller' || socket.userRole === 'captain') {
      socket.join(`${socket.userRole}:${socket.userId}`);
    } else {
      // Finance room: receives content-free "ledger changed" pings; data itself is refetched
      // through the authorised, brand-scoped REST API.
      socket.join('finance');
    }

    socket.on('disconnect', () => {
      // room leave is automatic
    });
  });

  console.log('[Socket.IO] Initialized for user notifications');
  return io;
};

export const getIO = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
};

/** Emit to one room (e.g. `seller:<id>`, `captain:<id>`, `finance`). Payloads carry no sensitive data. */
export const emitToRoom = (room, event, payload = {}) => {
  if (!io || !room) return;
  io.to(room).emit(event, { ...payload, at: Date.now() });
};

/** Tell connected admins that ledger data changed (no amounts/PII in the payload). */
export const emitFinanceUpdate = (payload = {}) => {
  if (!io) return;
  io.to('finance').emit('ledger:changed', { ...payload, at: Date.now() });
};

export default { initSocket, getIO, emitToUser, emitFinanceUpdate, emitToRoom };
