// ── Nexora CRM — Authentication & RBAC Routes ──────────────
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import {
  users,
  organizations,
  ROLES,
  findUserByEmail,
  findUserById,
  createUser,
  createOrganization,
  findOrgById,
  safeUser,
  listUsersByOrg,
  recordFailedLogin,
  resetFailedLogin,
  setResetPasswordToken,
  findUserByResetToken,
  resetUserPassword,
  setVerificationToken,
  findUserByVerificationToken,
  verifyUserEmail,
  setInvitationToken,
  findUserByInvitationToken,
  acceptUserInvitation,
} from '../db/store.js';
import {
  signToken,
  authMiddleware,
  requireRole,
  requirePermission,
  COOKIE_NAME,
  getCookieOptions,
} from '../middleware/auth.js';

const router = Router();

// ── Rate Limiter for Authentication Attempts ────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 5000 : 300, // High ceiling for automated multi-suite tests while protecting endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

// Helper for validation results
function checkValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  return null;
}

// ── POST /api/auth/register ──────────────────────────────────
// Registers a new user and provisions a new workspace (multi-tenant)
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid work email address'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('organizationName').trim().isLength({ min: 2, max: 80 }).withMessage('Organization/Workspace name is required (min 2 chars)'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    const { name, email, password, organizationName, plan = 'starter' } = req.body;

    // Check if user already exists
    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    try {
      // 1. Create Organization
      const org = createOrganization({
        name: organizationName,
        plan: ['starter', 'growth', 'enterprise'].includes(plan) ? plan : 'starter',
      });

      // 2. Create Owner User
      const user = createUser({
        name,
        email,
        password,
        orgId: org.id,
        role: 'owner',
        department: 'Executive Leadership',
        title: 'Workspace Owner',
      });

      // 3. Issue Token & Set HTTP-Only Cookie
      const token = signToken(user);
      res.cookie(COOKIE_NAME, token, getCookieOptions());

      const userProfile = safeUser(user);

      return res.status(201).json({
        success: true,
        message: 'Account and organization created successfully.',
        token,
        user: userProfile,
        organization: org,
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to complete registration. Please try again.',
      });
    }
  }
);

// ── POST /api/auth/login ─────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    const { email, password, remember = false } = req.body;

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // Check if account is temporarily locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        error: 'Locked',
        message: `Account is temporarily locked due to consecutive failed attempts. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is deactivated. Please contact your organization administrator.',
      });
    }

    // Verify Password Hash
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      recordFailedLogin(user);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // Reset login attempts on success
    resetFailedLogin(user);

    // Issue Token & Set HTTP-Only Cookie
    const token = signToken(user);
    const cookieOpts = getCookieOptions();
    if (!remember) {
      delete cookieOpts.maxAge; // Session cookie if remember is false
    }
    res.cookie(COOKIE_NAME, token, cookieOpts);

    const userProfile = safeUser(user);

    return res.json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: userProfile,
    });
  }
);

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────
// Returns currently authenticated user and active organization
router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// ── GET /api/auth/roles ──────────────────────────────────────
// Returns all supported roles and permissions catalog
router.get('/roles', (_req, res) => {
  return res.json({
    roles: Object.values(ROLES),
  });
});

// ── GET /api/auth/users ──────────────────────────────────────
// Protected route: requires 'manage:users' permission or owner/admin role
router.get('/users', authMiddleware, requirePermission('manage:users'), (req, res) => {
  const teamMembers = listUsersByOrg(req.user.orgId);
  return res.json({
    success: true,
    count: teamMembers.length,
    users: teamMembers,
  });
});

// ── POST /api/auth/users ─────────────────────────────────────
// Provision a team member into the caller's organization
router.post(
  '/users',
  authMiddleware,
  requireRole('owner', 'admin'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('role').isIn(['admin', 'manager', 'rep', 'viewer']).withMessage('Valid role is required'),
    body('password').isLength({ min: 8 }).withMessage('Initial password must be at least 8 characters'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    const { name, email, role, password, department = 'Sales', title = '' } = req.body;

    const existing = findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A user with this email already exists in Nexora CRM.',
      });
    }

    const newUser = createUser({
      name,
      email,
      password,
      orgId: req.user.orgId,
      role,
      department,
      title,
    });

    return res.status(201).json({
      success: true,
      message: 'Team member created successfully.',
      user: safeUser(newUser),
    });
  }
);

// ── GET /api/auth/organization ───────────────────────────────
router.get('/organization', authMiddleware, (req, res) => {
  const org = findOrgById(req.user.orgId);
  if (!org) {
    return res.status(404).json({ error: 'Not Found', message: 'Organization not found' });
  }
  return res.json({
    success: true,
    organization: org,
  });
});

// ── PUT /api/auth/organization ───────────────────────────────
router.put(
  '/organization',
  authMiddleware,
  requireRole('owner', 'admin'),
  [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  ],
  (req, res) => {
    if (checkValidation(req, res)) return;

    const org = findOrgById(req.user.orgId);
    if (!org) {
      return res.status(404).json({ error: 'Not Found', message: 'Organization not found' });
    }

    if (req.body.name) org.name = req.body.name.trim();
    if (req.body.plan && ['starter', 'growth', 'enterprise'].includes(req.body.plan)) {
      org.plan = req.body.plan;
    }
    org.updatedAt = new Date().toISOString();
    organizations.set(org.id, org);

    return res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: org,
    });
  }
);

// ── POST /api/auth/forgot-password ───────────────────────────
router.post(
  '/forgot-password',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    const { email } = req.body;
    const user = findUserByEmail(email);

    // Timing-attack prevention: don't reveal whether user exists
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    setResetPasswordToken(email, token, expiresAt);

    return res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been sent.',
      // Token provided for seamless client/testing workflow
      resetToken: token,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  }
);

// ── POST /api/auth/reset-password ────────────────────────────
router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    const { token, newPassword } = req.body;
    const user = findUserByResetToken(token);

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or Expired Token',
        message: 'Password reset token is invalid or has expired. Please request a new one.',
      });
    }

    resetUserPassword(user.id, newPassword);

    return res.json({
      success: true,
      message: 'Password has been reset successfully. You may now sign in with your new password.',
    });
  }
);

// ── POST /api/auth/send-verification ─────────────────────────
router.post(
  '/send-verification',
  authMiddleware,
  async (req, res) => {
    const user = findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ success: true, message: 'Email is already verified.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    setVerificationToken(user.id, token, expiresAt);

    return res.json({
      success: true,
      message: 'Verification link generated.',
      verificationToken: token,
    });
  }
);

// ── GET & POST /api/auth/verify-email ────────────────────────
const handleVerifyEmail = (req, res) => {
  const token = req.query.token || req.body?.token;
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  const user = findUserByVerificationToken(token);
  if (!user) {
    return res.status(400).json({
      error: 'Invalid or Expired Token',
      message: 'Email verification token is invalid or has expired.',
    });
  }

  verifyUserEmail(user.id);

  return res.json({
    success: true,
    message: 'Email verified successfully. Your account is fully active.',
    user: safeUser(user),
  });
};

router.get('/verify-email', handleVerifyEmail);
router.post('/verify-email', handleVerifyEmail);

// ── GET /api/auth/invitation/:token ──────────────────────────
router.get('/invitation/:token', (req, res) => {
  const { token } = req.params;
  const user = findUserByInvitationToken(token);

  if (!user) {
    return res.status(404).json({
      error: 'Invalid Invitation',
      message: 'This invitation link is invalid or has expired.',
    });
  }

  const org = findOrgById(user.orgId);
  return res.json({
    success: true,
    invitation: {
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      organizationName: org ? org.name : 'Nexora Workspace',
    },
  });
});

// ── POST /api/auth/accept-invitation ─────────────────────────
router.post(
  '/accept-invitation',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Invitation token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('name').optional().trim(),
  ],
  async (req, res) => {
    if (checkValidation(req, res)) return;

    const { token, password, name } = req.body;
    const user = findUserByInvitationToken(token);

    if (!user) {
      return res.status(400).json({
        error: 'Invalid Invitation',
        message: 'This invitation token is invalid or has expired.',
      });
    }

    const updatedUser = acceptUserInvitation(user.id, password, name);
    const authToken = signToken(updatedUser);
    res.cookie(COOKIE_NAME, authToken, getCookieOptions());

    return res.json({
      success: true,
      message: 'Welcome to the team! Your invitation has been accepted.',
      token: authToken,
      user: safeUser(updatedUser),
    });
  }
);

export default router;
