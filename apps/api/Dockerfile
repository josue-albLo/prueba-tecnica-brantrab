FROM node:22-alpine AS builder
WORKDIR /repo

RUN corepack enable

# Manifiestos del workspace primero, para aprovechar la caché de capas
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter ./apps/api...

COPY apps/api ./apps/api

WORKDIR /repo/apps/api
RUN pnpm prisma generate && pnpm build

# ---

FROM node:22-alpine
WORKDIR /app

RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --prod --frozen-lockfile --filter ./apps/api...

COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && pnpm prisma generate

COPY --from=builder /repo/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000

CMD ["node", "dist/main.js"]