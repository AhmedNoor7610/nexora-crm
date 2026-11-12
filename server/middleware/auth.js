// ── Nexora CRM — Authentication & RBAC Middleware ──────────
import jwt from 'jsonwebtoken';
import { findUserById, safeUser, hasPermission, ROLES } from '../db/store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexora-crm-production-secret-key-2026';
const TOKEN_EXPIRY = '7d';
export const COOKIE_NAME = 'nexora_token';

// ── JWT Sign / Verify ────────────────────────────────────────
export function signToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Cookie Options Helper ────────────────────────────────────
export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

// ── Primary Authentication Middleware ────────────────────────
export function authMiddleware(req, res, next) {
  // 1. Try HTTP-Only cookie first
  let token = req.cookies?.[COOKIE_NAME];

  // 2. Fall back to Authorization: Bearer <token>
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. No session token provided.',
    });
  }

  try {
    const decoded = verifyToken(token);
    const user = findUserById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid session: User account no longer exists.',
      });
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your account has been deactivated. Please contact your organization administrator.',
      });
    }

    // Attach safe user profile + raw user for controller logic
    req.user = safeUser(user);
    req.rawUser = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session expired. Please log in again.',
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or tampered authentication token.',
    });
  }
}

// ── Role-Based Authorization Middleware (RBAC) ───────────────
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    // Workspace owner always has all permissions
    if (req.user.role === 'owner') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
    });
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (hasPermission(req.user.role, permission)) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: `Access denied. Missing required permission: '${permission}'.`,
    });
  };
}

// ── Multi-Tenant Organization Scope Guard ────────────────────
export function requireOrgScope(req, res, next) {
  if (!req.user || !req.user.orgId) {
    return res.status(403).json({ error: 'Forbidden', message: 'No organization scope associated with user.' });
  }
  next();
}
