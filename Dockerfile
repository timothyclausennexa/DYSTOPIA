# Multi-stage build for DYSTOPIA: ETERNAL BATTLEGROUND

# Stage 1: Build
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/
COPY shared/package.json ./shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build client
RUN cd client && pnpm build

# Build server
RUN cd server && pnpm build

# Stage 2: Production
FROM node:20-alpine

# Install pnpm and PM2
RUN npm install -g pnpm pm2

# Create app user
RUN addgroup -g 1001 dystopia && \
    adduser -D -u 1001 -G dystopia dystopia

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/shared/package.json ./shared/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/shared/dist ./shared/dist

# Copy ecosystem config
COPY ecosystem.config.js ./

# Create logs directory
RUN mkdir -p logs && chown -R dystopia:dystopia logs

# Switch to app user
USER dystopia

# Expose ports
EXPOSE 3000 3001 3002 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
