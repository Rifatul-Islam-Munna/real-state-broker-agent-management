FROM node:lts-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:lts-bookworm-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:lts-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations

EXPOSE 80

CMD ["node", "dist/main.js"]
