FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

FROM base AS builder
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate

FROM base AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
COPY --from=builder /app/start.sh ./start.sh

RUN mkdir -p logs reports && chown -R nodejs:nodejs /app && chmod +x /app/start.sh
USER nodejs

EXPOSE 4000
CMD ["/app/start.sh"]
