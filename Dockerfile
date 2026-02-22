# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Install dependencies (manifests only for layer caching) ───────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/core/package.json           packages/core/
COPY packages/ingestion/package.json      packages/ingestion/
COPY packages/risk-engine/package.json    packages/risk-engine/
COPY packages/evidence-store/package.json packages/evidence-store/
COPY packages/llm-agent/package.json      packages/llm-agent/
COPY packages/web/package.json            packages/web/
RUN pnpm install --frozen-lockfile

# ── Build all workspace packages + Next.js app ────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# transpilePackages bundles workspace TS into the Next.js server bundle at build time
RUN pnpm --filter @flood/web build

# ── Minimal production image ──────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Runtime deps (Next.js, React, etc.) + workspace symlinks from pnpm store
COPY --from=builder /app/node_modules        ./node_modules
# Built Next.js app (workspace package code is already bundled inside)
COPY --from=builder /app/packages/web/.next  ./packages/web/.next
COPY --from=builder /app/packages/web/package.json ./packages/web/
# Workspace config so pnpm can resolve the start script
COPY --from=builder /app/package.json        ./
COPY --from=builder /app/pnpm-workspace.yaml ./

EXPOSE 3000
ENV PORT=3000

CMD ["pnpm", "--filter", "@flood/web", "start"]