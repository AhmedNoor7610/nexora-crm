// ── Nexora CRM — Real-Time Socket.IO Client ─────────────────
// Manages persistent authenticated WebSocket connection with
// org- and user-scoped event routing, reconnect logic, and
// event subscription management.

import { io } from 'socket.io-client';

// In Vite dev, the /socket.io path is proxied to :3001.
// In production we connect to the same origin.
const SERVER_URL = window.location.hostname === 'localhost'
  ? `http://localhost:3001`
  : window.location.origin;

let socket = null;
let currentUserId = null;
let currentOrgId = null;

// Event listener registry: { eventName: Set<handler> }
const listeners = new Map();

function getToken() {
  return sessionStorage.getItem('nexora_token') || localStorage.getItem('nexora_token');
}

// ── Connect / Authenticate ───────────────────────────────────
export function connectSocket(user) {
  if (socket?.connected) return socket;

  currentUserId = user.id;
  currentOrgId = user.orgId;

  const token = getToken();

  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('[Socket.IO] Connected:', socket.id);
  });

  socket.on('connected', (data) => {
    console.log('[Socket.IO] Authenticated:', data);
    _dispatch('socket:connected', data);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.IO] Disconnected:', reason);
    _dispatch('socket:disconnected', { reason });
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket.IO] Connection error:', err.message);
    _dispatch('socket:error', { message: err.message });
  });

  socket.on('reconnect', (attempt) => {
    console.log('[Socket.IO] Reconnected after', attempt, 'attempts');
    _dispatch('socket:reconnected', { attempt });
  });

  // ── CRM Event Routing ──────────────────────────────────────
  const CRM_EVENTS = [
    'notification:new',
    'activity:created',
    'activity:updated',
    'activity:deleted',
    'task:completed',
    'deal:updated',
    'deal:stage_changed',
    'lead:assigned',
    'reminder:fired',
  ];

  for (const event of CRM_EVENTS) {
    socket.on(event, (data) => {
      console.log(`[Socket.IO] Event: ${event}`, data);
      _dispatch(event, data);
    });
  }

  return socket;
}

// ── Disconnect ───────────────────────────────────────────────
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
    currentOrgId = null;
    listeners.clear();
    console.log('[Socket.IO] Disconnected and cleaned up.');
  }
}

// ── Event Subscribe / Unsubscribe ────────────────────────────
export function onSocketEvent(event, handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(handler);

  // Return cleanup function
  return () => offSocketEvent(event, handler);
}

export function offSocketEvent(event, handler) {
  listeners.get(event)?.delete(handler);
}

function _dispatch(event, data) {
  const handlers = listeners.get(event);
  if (!handlers) return;
  for (const handler of handlers) {
    try {
      handler(data);
    } catch (err) {
      console.error(`[Socket.IO] Handler error for ${event}:`, err);
    }
  }
}

// ── Status Helpers ───────────────────────────────────────────
export function isSocketConnected() {
  return socket?.connected || false;
}

export function getSocket() {
  return socket;
}
