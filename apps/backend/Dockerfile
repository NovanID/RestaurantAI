FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --include=dev --workspaces
RUN npm install --no-save --no-package-lock prisma@5.22.0 @nestjs/cli@11.0.0

COPY . .
RUN npx prisma generate --schema apps/backend/prisma/schema.prisma \
  && npm run build --workspace=apps/backend

WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
