#!/usr/bin/env tsx
/**
 * scripts/migrate-priority2.ts
 * =====================================================================
 * Sovereign Forge OS — Priority 2 Railway Migration
 *
 * Extends the Priority 1 scaffold by upgrading the worker server to:
 * - require shared-secret auth for non-health endpoints
 * - support a lightweight /run-manifest job endpoint
 * - expose /ready probe with dependency checks
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

function json(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

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

async function runManifestJob(input: unknown) {
  const startedAt = new Date().toISOString()
  return {
    ok: true,
    startedAt,
    finishedAt: new Date().toISOString(),
    input,
    note: 'Priority 2 scaffold: plug manifest engine execution here.',
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
      },
      timestamp: new Date().toISOString(),
    })
  }

  if (!isAuthorized(req)) {
    return json(res, 401, { error: 'Unauthorized' })
  }

  if (method === 'POST' && url.pathname === '/run-manifest') {
    try {
      const body = await readJsonBody(req)
      const result = await runManifestJob(body)
      return json(res, 202, result)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return json(res, 400, { error: message })
    }
  }

  return json(res, 404, { error: 'Not found', path: url.pathname })
})

server.listen(PORT, () => {
  console.log(\`🚂 Railway worker listening on :\${PORT}\`)
})
`)

console.log('\n✨ Priority 2 migration scaffold applied.')
