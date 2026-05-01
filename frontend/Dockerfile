# Finsight OS — frontend Dockerfile
#
# Multi-stage build: install + build in a Node image, serve in a slim runner.
# Runs Next.js 14 in production mode (`next start`) on port 3000.

# ── Stage 1: install + build ───────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install deps based on lockfile only (layer caches across code changes)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ── Stage 2: minimal runner ────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what `next start` needs
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "run", "start"]
