const fs = require('fs');

const dockerfileContent = `FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci --legacy-peer-deps
RUN cd frontend && npm ci --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN cd frontend && npm run build
RUN npm run build

FROM node:20-alpine AS production

RUN apk add --no-cache openssl

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force
RUN cd frontend && npm ci --only=production --legacy-peer-deps && npm cache clean --force

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/frontend/.next ./frontend/.next
COPY --from=builder --chown=nodejs:nodejs /app/frontend/public ./frontend/public

COPY --chown=nodejs:nodejs frontend/next.config.js ./frontend/
COPY --chown=nodejs:nodejs frontend/package.json ./frontend/

RUN mkdir -p logs && chown nodejs:nodejs logs

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
`;

// Write with explicit UTF-8 encoding, no BOM
fs.writeFileSync('Dockerfile', dockerfileContent, { encoding: 'utf8' });

console.log('✅ Dockerfile created successfully with clean UTF-8 encoding');
console.log('First 50 chars:', dockerfileContent.substring(0, 50));
