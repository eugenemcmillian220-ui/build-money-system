#!/usr/bin/env tsx
/**
 * scripts/migrate-priority1.ts
 * =====================================================================
 * Sovereign Forge OS — Priority 1 Railway Migration
 *
 * NOTE:
 * This file is created from the provided migration blueprint and writes
 * the scaffolded Railway worker files for Priority 1 migration.
 * =====================================================================
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
let written = 0

function write(filePath: string, content: string) {
  const abs = path.join(ROOT, filePath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf-8')
  console.log(`✅  wrote  ${filePath}`)
  written++
}

write('railway.json', `{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile.worker"
  },
  "deploy": {
    "startCommand": "node dist/worker/server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
`)

write('Dockerfile.worker', `# Sovereign Forge OS — Railway Worker
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npx tsc --project tsconfig.worker.json

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/package.json ./

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \\
  CMD wget -qO- http://localhost:8080/health || exit 1

EXPOSE 8080
CMD ["node", "dist/worker/server.js"]
`)

write('tsconfig.worker.json', `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "ES2022",
    "noEmit": false,
    "incremental": false,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "src/worker/**/*",
    "src/lib/**/*"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "src/app/**/*"
  ]
}
`)

write('src/worker/server.ts', `import http from 'http'
import { URL } from 'url'

const PORT = parseInt(process.env.PORT ?? '8080', 10)

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) })
  res.end(payload)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', \`http://localhost:\${PORT}\`)

  if (url.pathname === '/health') {
    return json(res, 200, { status: 'healthy', timestamp: new Date().toISOString() })
  }

  return json(res, 404, { error: 'Not found', path: url.pathname })
})

server.listen(PORT, () => {
  console.log(\`🚂 Railway worker listening on :\${PORT}\`)
})
`)

write('.env.railway', `# Railway worker env template
PORT=8080
WORKER_SHARED_SECRET=replace_me
RAILWAY_PUBLIC_DOMAIN=
`)

console.log(`\n✨ Migration scaffold complete. Files written: ${written}`)
