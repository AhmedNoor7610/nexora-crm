# ============================================================
# Nexora CRM — Production Multi-Stage Dockerfile
# Stage 1: Build Frontend Assets (Vite)
# Stage 2: Minimal Production Node.js Server Runtime
# ============================================================

# ── Stage 1: Build Client ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy client source files & assets
COPY index.html ./
COPY vite.config.js* ./
COPY src ./src
COPY public ./public

# Build optimized production bundle to /build/dist
RUN npm run build

# ── Stage 2: Production Runtime ──────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built static frontend from builder stage
COPY --from=builder /build/dist ./dist

# Copy backend server code & database models
COPY server ./server

# Run as non-privileged user for container security
USER node

# Expose HTTP & WebSocket port
EXPOSE 3001

# Healthcheck to ensure container is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the Node.js Express & Socket.IO server
CMD ["node", "server/index.js"]

