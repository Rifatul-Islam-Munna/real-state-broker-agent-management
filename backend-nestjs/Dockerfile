FROM node:lts-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:lts-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:lts-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations

EXPOSE 80

CMD ["npm", "run", "start:prod"]
