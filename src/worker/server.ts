import * as http from 'http'
import { URL } from 'url'

const PORT = parseInt(process.env.PORT ?? '8080', 10)
const WORKER_SHARED_SECRET = process.env.WORKER_SHARED_SECRET ?? ''
const DEFAULT_MAX_CONCURRENT_JOBS = 3
const DEFAULT_IDEMPOTENCY_TTL_MS = 5 * 60 * 1000
const REQUEST_BODY_LIMIT_BYTES = 1024 * 1024

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const parsed = parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const MAX_CONCURRENT_JOBS = readPositiveIntegerEnv(
  'WORKER_MAX_CONCURRENCY',
  DEFAULT_MAX_CONCURRENT_JOBS,
)
const IDEMPOTENCY_TTL_MS = readPositiveIntegerEnv(
  'WORKER_IDEMPOTENCY_TTL_MS',
  DEFAULT_IDEMPOTENCY_TTL_MS,
)

type JsonObject = Record<string, unknown>

type CachedManifestResponse = JsonObject & {
  ok: boolean
  deduped: boolean
}

type IdempotencyCacheEntry = {
  expiresAt: number
  response: CachedManifestResponse
}

let inflightJobs = 0
let totalJobsStarted = 0
let totalJobsCompleted = 0
let totalJobsFailed = 0
let isShuttingDown = false

const idempotencyCache = new Map<string, IdempotencyCacheEntry>()

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

const cleanupTimer = setInterval(cleanupIdempotencyCache, 30_000)
cleanupTimer.unref()

function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = ''
    let rejected = false

    req.on('data', chunk => {
      if (rejected) return
      raw += chunk
      if (raw.length > REQUEST_BODY_LIMIT_BYTES) {
        rejected = true
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (rejected) return
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', error => {
      if (!rejected) reject(error)
    })
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

async function runManifestJob(input: unknown): Promise<CachedManifestResponse> {
  const startedAt = new Date().toISOString()

  // Placeholder for the real manifest engine call. Keep this asynchronous so the
  // worker exercises capacity limits and shutdown behavior the same way the
  // production job runner will.
  await new Promise(resolve => setTimeout(resolve, 25))

  return {
    ok: true,
    deduped: false,
    startedAt,
    finishedAt: new Date().toISOString(),
    input,
    note: 'Priority 3 worker: manifest execution hook completed.',
  }
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET'
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

  if (url.pathname === '/health') {
    return json(res, isShuttingDown ? 503 : 200, {
      status: isShuttingDown ? 'shutting_down' : 'healthy',
      timestamp: new Date().toISOString(),
    })
  }

  if (url.pathname === '/ready') {
    const sharedSecretConfigured = Boolean(WORKER_SHARED_SECRET)
    const underConcurrencyLimit = inflightJobs < MAX_CONCURRENT_JOBS
    const ready = sharedSecretConfigured && underConcurrencyLimit && !isShuttingDown

    return json(res, ready ? 200 : 503, {
      ready,
      checks: {
        sharedSecretConfigured,
        underConcurrencyLimit,
        acceptingNewJobs: !isShuttingDown,
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
      idempotencyTtlMs: IDEMPOTENCY_TTL_MS,
      acceptingNewJobs: !isShuttingDown,
      timestamp: new Date().toISOString(),
    })
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { error: 'Unauthorized' })
  }

  if (method === 'POST' && url.pathname === '/run-manifest') {
    if (isShuttingDown) {
      return json(res, 503, { error: 'Worker is shutting down' })
    }

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
      const response = await runManifestJob(body)
      totalJobsCompleted++
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
  console.log(`🚂 Railway worker listening on :${PORT}`)
})

function shutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true
  cleanupTimer.unref()
  cleanupIdempotencyCache()
  console.log(`[worker] received ${signal}, shutting down...`)
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
