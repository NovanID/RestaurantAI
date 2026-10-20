FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

RUN npm ci --workspace=apps/backend --include-workspace-root

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/

RUN npm ci --workspace=apps/backend --include-workspace-root

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/backend
RUN mkdir -p uploads/menu

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
