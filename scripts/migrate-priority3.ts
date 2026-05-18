#!/usr/bin/env tsx
/**
 * scripts/migrate-priority3.ts
 * =====================================================================
 * Sovereign Forge OS — Priority 3 Railway Migration
 *
 * Extends the Priority 2 scaffold by upgrading the worker server to:
 * - add in-memory idempotency caching for /run-manifest requests
 * - add a basic concurrency limiter for job execution
 * - expose /metrics for lightweight operational visibility
 * - add graceful shutdown handling for SIGTERM/SIGINT
 * =====================================================================
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

function write(filePath: string, content: string) {
  const abs = path.join(ROOT, filePath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf-8')
  console.log(`✅ wrote ${filePath}`)
}

write('src/worker/server.ts', `import * as http from 'http'
import { URL } from 'url'

const PORT = parseInt(process.env.PORT ?? '8080', 10)
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET ?? ''
const MAX_CONCURRENT_JOBS = parseInt(process.env.WORKER_MAX_CONCURRENCY ?? '3', 10)
const IDEMPOTENCY_TTL_MS = parseInt(process.env.WORKER_IDEMPOTENCY_TTL_MS ?? '300000', 10)

let inflightJobs = 0
let totalJobsStarted = 0
let totalJobsCompleted = 0
let totalJobsFailed = 0

const idempotencyCache = new Map<string, { expiresAt: number; response: unknown }>()

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function cleanupIdempotencyCache() {
  const now = Date.now()
  for (const [key, entry] of idempotencyCache.entries()) {
    if (entry.expiresAt <= now) {
      idempotencyCache.delete(key)
    }
  }
}

setInterval(cleanupIdempotencyCache, 30000).unref()

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', chunk => {
      raw += chunk
      if (raw.length > 1024 * 1024) {
        reject(new Error('Request body too large'))
      }
    })
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function isAuthorized(req: http.IncomingMessage): boolean {
  if (!WORKER_SHARED_SECRET) return false
  const fromHeader = req.headers['x-worker-secret']
  if (typeof fromHeader !== 'string') return false
  return fromHeader === WORKER_SHARED_SECRET
}

function getIdempotencyKey(req: http.IncomingMessage): string | null {
  const value = req.headers['idempotency-key']
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function runManifestJob(input: unknown) {
  const startedAt = new Date().toISOString()
  await new Promise(resolve => setTimeout(resolve, 25))
  return {
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    input,
    note: 'Priority 3 scaffold: plug manifest engine execution + persistence here.',
  }
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET'
  const url = new URL(req.url ?? '/', \`http://localhost:\${PORT}\`)

  if (url.pathname === '/health') {
    return json(res, 200, { status: 'healthy', timestamp: new Date().toISOString() })
  }

  if (url.pathname === '/ready') {
    const ready = Boolean(WORKER_SHARED_SECRET)
    return json(res, ready ? 200 : 503, {
      ready,
      checks: {
        sharedSecretConfigured: ready,
        underConcurrencyLimit: inflightJobs < MAX_CONCURRENT_JOBS,
      },
      timestamp: new Date().toISOString(),
    })
  }

  if (url.pathname === '/metrics') {
    cleanupIdempotencyCache()
    return json(res, 200, {
      inflightJobs,
      totalJobsStarted,
      totalJobsCompleted,
      totalJobsFailed,
      idempotencyCacheSize: idempotencyCache.size,
      maxConcurrentJobs: MAX_CONCURRENT_JOBS,
      timestamp: new Date().toISOString(),
    })
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { error: 'Unauthorized' })
  }

  if (method === 'POST' && url.pathname === '/run-manifest') {
    const idempotencyKey = getIdempotencyKey(req)
    if (!idempotencyKey) {
      return json(res, 400, { error: 'Missing idempotency-key header' })
    }

    cleanupIdempotencyCache()
    const cached = idempotencyCache.get(idempotencyKey)
    if (cached && cached.expiresAt > Date.now()) {
      return json(res, 200, { ...cached.response, deduped: true })
    }

    if (inflightJobs >= MAX_CONCURRENT_JOBS) {
      return json(res, 429, {
        error: 'Worker at capacity',
        inflightJobs,
        maxConcurrentJobs: MAX_CONCURRENT_JOBS,
      })
    }

    inflightJobs++
    totalJobsStarted++

    try {
      const body = await readJsonBody(req)
      const result = await runManifestJob(body)
      totalJobsCompleted++
      const response = { ...result, deduped: false }
      idempotencyCache.set(idempotencyKey, {
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
        response,
      })
      return json(res, 202, response)
    } catch (error) {
      totalJobsFailed++
      const message = error instanceof Error ? error.message : 'Unknown error'
      return json(res, 400, { error: message })
    } finally {
      inflightJobs--
    }
  }

  return json(res, 404, { error: 'Not found', path: url.pathname })
})

server.listen(PORT, () => {
  console.log(\`🚂 Railway worker listening on :\${PORT}\`)
})

function shutdown(signal: string) {
  console.log(\`[worker] received \${signal}, shutting down...\`)
  server.close(error => {
    if (error) {
      console.error('[worker] shutdown error', error)
      process.exit(1)
    }
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
`)

console.log('\n✨ Priority 3 migration scaffold applied.')
