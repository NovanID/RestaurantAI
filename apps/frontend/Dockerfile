FROM node:22-alpine

WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --include=dev --workspaces

COPY . .
RUN npm run build --workspace=apps/frontend

WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["npm", "run", "start"]
