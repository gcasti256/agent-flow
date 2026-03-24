# ─── Build Stage ─────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json tsup.config.ts tsconfig.json ./
RUN npm ci
COPY src/ src/
RUN npm run build

# ─── Production Stage ────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup --system agent && adduser --system --ingroup agent agent
USER agent

ENTRYPOINT ["node"]
CMD ["dist/index.js"]
