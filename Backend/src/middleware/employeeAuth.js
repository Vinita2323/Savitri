import jwt from 'jsonwebtoken';
import Employee from '../models/Employee.model.js';
import { getJwtSecret, JWT_ALGORITHMS } from '../utils/jwtConfig.js';

export const EMPLOYEE_BLOCKED_STATUSES = ['Inactive', 'Terminated'];

/**
 * Employee-portal authentication. Uses only the Authorization header (never the admin cookies) and
 * re-reads the employee from MongoDB on every request, so approval, deactivation, brand and role are
 * never trusted from the token.
 */
export const protectEmployee = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1]?.trim() : '';
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: JWT_ALGORITHMS });
    if (decoded.role !== 'employee' || !decoded.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: Employee access only' });
    }
    const emp = await Employee.findById(decoded.id);
    if (!emp) return res.status(401).json({ success: false, message: 'Not authorized, account no longer exists' });
    if ((emp.registrationStatus || 'Approved') !== 'Approved') {
      return res.status(403).json({ success: false, message: 'Your registration is not approved' });
    }
    if (EMPLOYEE_BLOCKED_STATUSES.includes(emp.employmentStatus)) {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact your administrator.' });
    }
    if (Number(decoded.tv || 0) !== Number(emp.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Not authorized, session has been revoked' });
    }
    req.employee = emp;
    req.sessionId = decoded.sid || null;
    // Same shape as other roles so shared helpers (activity logs) can read it.
    req.user = { id: String(emp._id), role: 'employee', name: emp.fullName, email: emp.email };
    return next();
  } catch (err) {
    if (err?.message === 'JWT_SECRET is not configured') {
      return res.status(500).json({ success: false, message: 'Server authentication is misconfigured' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};
