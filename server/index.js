// ── Nexora CRM — Express Backend ───────────────────────────
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createServer } from 'http';
import { connectDB, getDatabaseHealth } from './db/connection.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import leadsRoutes from './routes/leads.js';
import contactsRoutes from './routes/contacts.js';
import companiesRoutes from './routes/companies.js';
import dealsRoutes from './routes/deals.js';
import activitiesRoutes from './routes/activities.js';
import notificationsRoutes from './routes/notifications.js';
import teamRoutes from './routes/team.js';
import reportsRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import emailsRoutes from './routes/emails.js';
import attachmentsRoutes from './routes/attachments.js';
import { initSocketServer } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// ── Initialize Database Connection ───────────────────────────
connectDB();

// ── Security Headers ─────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Vite dev server and inline SVG compatibility
  })
);

// ── CORS Configuration (Supports credentials & cookies) ──────
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (isProd) {
        return callback(new Error('CORS policy: Not allowed by CORS'));
      }
      return callback(null, true); // Dev mode flexible
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ── Body & Cookie Parsers ────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── API General Rate Limiter ─────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Generous limit for high-density dashboards & tests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', apiLimiter);

// Request logger (dev)
app.use((req, _res, next) => {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/tasks', activitiesRoutes); // Convenient alias
app.use('/api/notifications', notificationsRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/attachments', attachmentsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  const dbHealth = getDatabaseHealth();
  const isHealthy = !dbHealth.productionAlert;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    version: '1.5.0',
    service: 'Nexora CRM Enterprise Engine',
    realtime: 'Socket.IO Enabled',
    database: dbHealth,
    timestamp: new Date().toISOString(),
  });
});

// ── Production Static Asset Serving & SPA Routing ────────────
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for frontend client routing (Express 5 compatible)
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Requested API endpoint does not exist' });
});

// Central Error handler
app.use((err, _req, res, _next) => {
  console.error('[API Error]', err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred on the server',
  });
});

// ── Create HTTP + Socket.IO Server ───────────────────────────
const httpServer = createServer(app);
initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Nexora CRM API running on http://localhost:${PORT}`);
  console.log(`   Health:        http://localhost:${PORT}/api/health`);
  console.log(`   Activities:    http://localhost:${PORT}/api/activities`);
  console.log(`   Notifications: http://localhost:${PORT}/api/notifications`);
  console.log(`   Real-Time:     Socket.IO Attached\n`);
});
