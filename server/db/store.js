// ── Nexora CRM — In-Memory Database Store ─────────────────────
// Multi-tenant store supporting Organizations, Users, Roles & Permissions
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// ── Roles & Permissions ──────────────────────────────────────
export const ROLES = {
  owner: {
    key: 'owner',
    label: 'Owner',
    level: 100,
    description: 'Full workspace control & billing access',
    permissions: ['*']
  },
  admin: {
    key: 'admin',
    label: 'Administrator',
    level: 80,
    description: 'Workspace configuration and team management',
    permissions: ['manage:users', 'manage:org', 'view:all', 'edit:all', 'delete:all']
  },
  manager: {
    key: 'manager',
    label: 'Sales Manager',
    level: 60,
    description: 'Team oversight, pipeline analytics, and deal management',
    permissions: ['view:all', 'edit:all', 'delete:own', 'manage:team']
  },
  rep: {
    key: 'rep',
    label: 'Sales Representative',
    level: 40,
    description: 'Lead generation, deal tracking, and customer contact',
    permissions: ['view:own', 'edit:own', 'create:deals', 'create:contacts']
  },
  viewer: {
    key: 'viewer',
    label: 'Viewer (Read-Only)',
    level: 20,
    description: 'Read-only access to assigned pipeline data',
    permissions: ['view:own']
  },
};

export function hasPermission(userRole, permission) {
  const role = ROLES[userRole];
  if (!role) return false;
  if (role.permissions.includes('*')) return true;
  return role.permissions.includes(permission);
}

// ── Organizations Store ──────────────────────────────────────
export const organizations = new Map([
  ['org-001', {
    id: 'org-001',
    name: 'Nexora Enterprise',
    slug: 'nexora-enterprise',
    plan: 'enterprise',
    maxUsers: 100,
    domain: 'nexora.io',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }],
]);

export function createOrganization({ name, plan = 'starter', maxUsers = 25 }) {
  const id = `org-${uuidv4().slice(0, 8)}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `org-${Date.now()}`;
  const org = {
    id,
    name: name.trim(),
    slug,
    plan,
    maxUsers,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  organizations.set(id, org);
  return org;
}

export function findOrgById(id) {
  return organizations.get(id) || null;
}

// ── Users Store ──────────────────────────────────────────────
export const users = new Map();

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

// Seed Demo Users
function seedUser(data) {
  users.set(data.id, data);
}

const defaultPasswordHash = hashPassword('nexora123');

seedUser({
  id: 'user-001',
  orgId: 'org-001',
  name: 'Alexandra Reid',
  email: 'admin@nexora.io',
  passwordHash: defaultPasswordHash,
  role: 'owner',
  avatar: 'AR',
  department: 'Executive Leadership',
  title: 'Chief Revenue Officer',
  isActive: true,
  emailVerified: true,
  createdAt: '2024-01-15T09:00:00Z',
  lastLoginAt: '2024-10-31T12:00:00Z',
  failedAttempts: 0,
  lockUntil: null,
});

seedUser({
  id: 'user-002',
  orgId: 'org-001',
  name: 'Marcus Chen',
  email: 'marcus@nexora.io',
  passwordHash: defaultPasswordHash,
  role: 'manager',
  avatar: 'MC',
  department: 'Global Sales',
  title: 'VP of Sales',
  isActive: true,
  emailVerified: true,
  createdAt: '2024-03-20T09:00:00Z',
  lastLoginAt: '2024-10-30T16:30:00Z',
  failedAttempts: 0,
  lockUntil: null,
});

seedUser({
  id: 'user-003',
  orgId: 'org-001',
  name: 'Priya Sharma',
  email: 'priya@nexora.io',
  passwordHash: defaultPasswordHash,
  role: 'rep',
  avatar: 'PS',
  department: 'Inbound Sales',
  title: 'Senior Account Executive',
  isActive: true,
  emailVerified: true,
  createdAt: '2024-04-10T09:00:00Z',
  lastLoginAt: '2024-10-29T11:15:00Z',
  failedAttempts: 0,
  lockUntil: null,
});

seedUser({
  id: 'user-004',
  orgId: 'org-001',
  name: 'Jordan Williams',
  email: 'jordan@nexora.io',
  passwordHash: defaultPasswordHash,
  role: 'viewer',
  avatar: 'JW',
  department: 'Marketing Ops',
  title: 'Growth Analyst',
  isActive: false, // Inactive account for testing RBAC suspension flow
  emailVerified: true,
  createdAt: '2024-05-01T09:00:00Z',
  lastLoginAt: null,
  failedAttempts: 0,
  lockUntil: null,
});

// ── Store Helpers ────────────────────────────────────────────
export function safeUser(user) {
  if (!user) return null;
  const { passwordHash, failedAttempts, lockUntil, ...safe } = user;
  const org = organizations.get(safe.orgId);
  const roleConfig = ROLES[safe.role] || ROLES.viewer;
  return {
    ...safe,
    roleTitle: roleConfig.label,
    roleLevel: roleConfig.level,
    permissions: roleConfig.permissions,
    organization: org ? { id: org.id, name: org.name, plan: org.plan, slug: org.slug } : null,
  };
}

export function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  for (const u of users.values()) {
    if (u.email.toLowerCase() === normalized) return u;
  }
  return null;
}

export function findUserById(id) {
  return users.get(id) || null;
}

export function createUser({ name, email, password, orgId, role = 'rep', department = 'General', title = '' }) {
  const id = `user-${uuidv4().slice(0, 8)}`;
  const initials = name
    .trim()
    .split(/\s+/)
    .map(p => p[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('') || 'NX';

  const user = {
    id,
    orgId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    role,
    avatar: initials,
    department,
    title,
    isActive: true,
    emailVerified: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    failedAttempts: 0,
    lockUntil: null,
  };

  users.set(id, user);
  return user;
}

export function listUsersByOrg(orgId) {
  const list = [];
  for (const u of users.values()) {
    if (u.orgId === orgId) {
      list.push(safeUser(u));
    }
  }
  return list;
}

export function recordFailedLogin(user) {
  user.failedAttempts = (user.failedAttempts || 0) + 1;
  // If 5 failed attempts, lock for 15 minutes
  if (user.failedAttempts >= 5) {
    user.lockUntil = Date.now() + 15 * 60 * 1000;
  }
  users.set(user.id, user);
  return user;
}

export function resetFailedLogin(user) {
  user.failedAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date().toISOString();
  users.set(user.id, user);
  return user;
}

// ── Token & Lifecycle Helpers ────────────────────────────────
export function setResetPasswordToken(email, token, expiresAt) {
  const user = findUserByEmail(email);
  if (!user) return null;
  user.resetPasswordToken = token;
  user.resetPasswordExpires = expiresAt;
  users.set(user.id, user);
  return user;
}

export function findUserByResetToken(token) {
  if (!token) return null;
  const now = Date.now();
  for (const u of users.values()) {
    if (u.resetPasswordToken === token && u.resetPasswordExpires && u.resetPasswordExpires > now) {
      return u;
    }
  }
  return null;
}

export function resetUserPassword(userId, newPassword) {
  const user = findUserById(userId);
  if (!user) return null;
  user.passwordHash = hashPassword(newPassword);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.failedAttempts = 0;
  user.lockUntil = null;
  users.set(user.id, user);
  return user;
}

export function setVerificationToken(userId, token, expiresAt) {
  const user = findUserById(userId);
  if (!user) return null;
  user.verificationToken = token;
  user.verificationExpires = expiresAt;
  users.set(user.id, user);
  return user;
}

export function findUserByVerificationToken(token) {
  if (!token) return null;
  const now = Date.now();
  for (const u of users.values()) {
    if (u.verificationToken === token && (!u.verificationExpires || u.verificationExpires > now)) {
      return u;
    }
  }
  return null;
}

export function verifyUserEmail(userId) {
  const user = findUserById(userId);
  if (!user) return null;
  user.emailVerified = true;
  user.verificationToken = null;
  user.verificationExpires = null;
  users.set(user.id, user);
  return user;
}

export function setInvitationToken(userId, token, expiresAt) {
  const user = findUserById(userId);
  if (!user) return null;
  user.invitationToken = token;
  user.invitationExpires = expiresAt;
  users.set(user.id, user);
  return user;
}

export function findUserByInvitationToken(token) {
  if (!token) return null;
  const now = Date.now();
  for (const u of users.values()) {
    if (u.invitationToken === token && u.invitationExpires && u.invitationExpires > now) {
      return u;
    }
  }
  return null;
}

export function acceptUserInvitation(userId, newPassword, newName) {
  const user = findUserById(userId);
  if (!user) return null;
  if (newName && newName.trim()) {
    user.name = newName.trim();
  }
  if (newPassword) {
    user.passwordHash = hashPassword(newPassword);
  }
  user.isActive = true;
  user.emailVerified = true;
  user.invitationToken = null;
  user.invitationExpires = null;
  user.failedAttempts = 0;
  user.lockUntil = null;
  users.set(user.id, user);
  return user;
}
