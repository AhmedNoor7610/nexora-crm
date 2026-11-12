// ── Nexora CRM — Real-Time Socket.IO Server & Event Emitter ──
import { Server } from 'socket.io';
import { verifyToken, COOKIE_NAME } from './middleware/auth.js';
import { findUserById } from './db/store.js';
import { crmStore } from './db/crmStore.js';

let io = null;
let reminderIntervalId = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      // Check cookie if not in auth payload
      if (!token && socket.handshake.headers?.cookie) {
        const rawCookies = socket.handshake.headers.cookie.split(';');
        for (const c of rawCookies) {
          const [k, v] = c.trim().split('=');
          if (k === COOKIE_NAME) {
            token = decodeURIComponent(v);
            break;
          }
        }
      }

      if (!token) {
        return next(new Error('Authentication required: No token provided'));
      }

      const decoded = verifyToken(token);
      const user = findUserById(decoded.sub);

      if (!user || !user.isActive) {
        return next(new Error('Authentication failed: Invalid or inactive user'));
      }

      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      };

      next();
    } catch (err) {
      return next(new Error(`Authentication failed: ${err.message}`));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, name, orgId, role } = socket.user;

    // Join organization-wide room and personal user room
    const orgRoom = `org_${orgId}`;
    const userRoom = `user_${userId}`;

    socket.join(orgRoom);
    socket.join(userRoom);

    console.log(`[Socket.IO] Connected: ${name} (${role}) -> Joined [${orgRoom}, ${userRoom}]`);

    socket.emit('connected', {
      status: 'authenticated',
      userId,
      orgId,
      timestamp: new Date().toISOString(),
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected: ${name} (${reason})`);
    });
  });

  // Start background reminder checks (every 10 seconds)
  if (!reminderIntervalId) {
    reminderIntervalId = setInterval(async () => {
      try {
        const reminders = await crmStore.checkPendingReminders();
        for (const item of reminders) {
          emitNotification(item.notification);
        }
      } catch (err) {
        console.error('[Socket.IO] Reminder loop error:', err.message);
      }
    }, 10000);
  }

  return io;
}

export function getIO() {
  return io;
}

// ── Real-Time Emitters (Organization & User Scoped) ─────────
export function emitNotification(notification) {
  if (!io) return;

  if (notification.userId) {
    // User-scoped notification
    const targetRoom = `user_${notification.userId}`;
    io.to(targetRoom).emit('notification:new', notification);
    console.log(`[Socket.IO] Emitted notification:new to ${targetRoom}: "${notification.title}"`);
  } else {
    // Org-wide notification
    const targetRoom = `org_${notification.orgId}`;
    io.to(targetRoom).emit('notification:new', notification);
    console.log(`[Socket.IO] Emitted org notification:new to ${targetRoom}: "${notification.title}"`);
  }
}

export function emitActivityEvent(orgId, eventName, data) {
  if (!io) return;
  const targetRoom = `org_${orgId}`;
  io.to(targetRoom).emit(eventName, data);
  console.log(`[Socket.IO] Emitted ${eventName} to ${targetRoom}`);
}
