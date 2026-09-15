FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build



FROM node:22-alpine
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
RUN pnpm install --prod --frozen-lockfile && pnpm prisma generate

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/main.js"]