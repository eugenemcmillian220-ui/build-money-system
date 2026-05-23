import express from 'express';
import cors from 'cors';
import { executePipeline } from './pipeline/executor.js';
import { markFailed } from './pipeline/state.js';
import { createServiceClient } from './lib/supabase.js';

process.on('uncaughtException', (err) => { console.error('[FATAL] Uncaught:', err); process.exit(1); });
process.on('unhandledRejection', (r) => { console.error('[FATAL] Unhandled rejection:', r); process.exit(1); });

const app = express();
app.use(express.json({ limit: '2mb' }));

const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_APP_URL
  || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : undefined) || '*';
app.use(cors({ origin: allowedOrigin, methods: ['POST', 'GET'] }));

const MAX_CONCURRENT = Number(process.env.WORKER_MAX_CONCURRENCY ?? 3);
let inFlight = 0;

// ─── Auth helpers ────────────────────────────────────────────────────────────

function getSecret(): string | undefined {
  return process.env.RAILWAY_INTERNAL_SECRET || process.env.WORKER_SHARED_SECRET;
}

/** Bearer-token auth (used by /pipeline/execute and /pipeline/status) */
function authCheck(req: express.Request, res: express.Response): boolean {
  const secret = getSecret();
  if (!secret) { res.status(503).json({ error: 'Server misconfigured: secret not set' }); return false; }
  if (!req.headers.authorization || req.headers.authorization !== 'Bearer ' + secret) {
    res.status(401).json({ error: 'Unauthorized' }); return false;
  }
  return true;
}

/** Header-based auth (used by /run-manifest — matches Vercel chain.ts) */
function workerSecretCheck(req: express.Request, res: express.Response): boolean {
  const secret = getSecret();
  if (!secret) { res.status(503).json({ error: 'Server misconfigured: secret not set' }); return false; }
  const provided = req.headers['x-worker-secret'];
  if (!provided || provided !== secret) {
    res.status(401).json({ error: 'Unauthorized' }); return false;
  }
  return true;
}

// ─── Health / ready / metrics ─────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', inFlight, maxConcurrent: MAX_CONCURRENT, timestamp: new Date().toISOString() });
});

app.get('/ready', (_req, res) => {
  const secret = getSecret();
  const ready = Boolean(secret) && inFlight < MAX_CONCURRENT;
  res.status(ready ? 200 : 503).json({
    ready,
    checks: {
      sharedSecretConfigured: Boolean(secret),
      underConcurrencyLimit: inFlight < MAX_CONCURRENT,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', (_req, res) => {
  res.json({
    inflightJobs: inFlight,
    maxConcurrentJobs: MAX_CONCURRENT,
    timestamp: new Date().toISOString(),
  });
});

// ─── /run-manifest — Vercel manifest pipeline stage dispatch ─────────────────
// Vercel chain.ts sends: POST /run-manifest
//   headers: X-Worker-Secret, Idempotency-Key
//   body: { baseUrl, jobId, stage }
//
// This endpoint calls back to Vercel's /api/manifest/worker?stage=<stage>
// so each pipeline stage runs in its own Vercel serverless invocation.

const idempotencyCache = new Map<string, { expiresAt: number; response: Record<string, unknown> }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 min
const STAGE_CALLBACK_TIMEOUT_MS = Number(process.env.WORKER_STAGE_CALLBACK_TIMEOUT_MS ?? 65_000);

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of idempotencyCache) { if (v.expiresAt <= now) idempotencyCache.delete(k); }
}, 30_000).unref();

app.post('/run-manifest', async (req, res) => {
  if (!workerSecretCheck(req, res)) return;

  const idempotencyKey = (req.headers['idempotency-key'] as string | undefined)?.trim();
  if (!idempotencyKey) {
    res.status(400).json({ error: 'Missing idempotency-key header' }); return;
  }

  const cached = idempotencyCache.get(idempotencyKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.status(200).json({ ...cached.response, deduped: true }); return;
  }

  if (inFlight >= MAX_CONCURRENT) {
    res.status(429).json({ error: 'Worker at capacity', inFlight, maxConcurrent: MAX_CONCURRENT }); return;
  }

  const { baseUrl, jobId, stage } = req.body as { baseUrl?: string; jobId?: string; stage?: string };
  if (!baseUrl || !jobId || !stage) {
    res.status(400).json({ error: 'Missing baseUrl, jobId, or stage' }); return;
  }

  const secret = getSecret()!;
  inFlight++;
  const startedAt = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STAGE_CALLBACK_TIMEOUT_MS);

    let callbackRes: Response;
    try {
      callbackRes = await fetch(
        `${baseUrl}/api/manifest/worker?stage=${encodeURIComponent(stage)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Worker-Secret': secret,
          },
          body: JSON.stringify({ jobId }),
          signal: controller.signal,
        },
      );
    } finally {
      clearTimeout(timer);
    }

    const responseText = await callbackRes.text().catch(() => '');
    if (!callbackRes.ok) {
      throw new Error(`Manifest stage callback HTTP ${callbackRes.status}: ${responseText.slice(0, 300)}`);
    }

    let callback: unknown = responseText;
    try { callback = JSON.parse(responseText); } catch { /* keep as text */ }

    const response = {
      ok: true,
      deduped: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      jobId,
      stage,
      callback,
    };

    idempotencyCache.set(idempotencyKey, { expiresAt: Date.now() + IDEMPOTENCY_TTL_MS, response });
    res.status(202).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[run-manifest] stage=${stage} job=${jobId} error:`, message);
    res.status(400).json({ error: message });
  } finally {
    inFlight--;
  }
});

// ─── /pipeline/execute — Railway-native 25-phase pipeline ────────────────────

app.get('/pipeline/status/:jobId', async (req, res) => {
  if (!authCheck(req, res)) return;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from('pipeline_jobs')
      .select('id,status,current_phase,current_phase_name,completed_phases,error,created_at,updated_at,completed_at')
      .eq('id', req.params.jobId).single();
    if (error || !data) { res.status(404).json({ error: 'Job not found' }); return; }
    res.json(data);
  } catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : String(err) }); }
});

app.post('/pipeline/execute', async (req, res) => {
  if (!authCheck(req, res)) return;
  const { jobId, userId, spec } = req.body as { jobId?: string; userId?: string; spec?: Record<string, unknown> };
  if (!jobId || !userId || !spec) { res.status(400).json({ error: 'Missing jobId, userId, or spec' }); return; }
  if (inFlight >= MAX_CONCURRENT) {
    res.status(503).json({ error: 'Pipeline worker at capacity. Retry in a moment.', inFlight, maxConcurrent: MAX_CONCURRENT });
    return;
  }
  res.status(202).json({ message: 'Pipeline started', jobId });
  inFlight++;
  executePipeline({ jobId, userId, spec })
    .catch(async (err) => {
      console.error('[server] pipeline', jobId, 'fatal:', err);
      await markFailed(jobId, err instanceof Error ? err.message : String(err));
    })
    .finally(() => { inFlight--; });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log('Railway pipeline server running on port ' + PORT);
  console.log('CORS origin: ' + allowedOrigin);
  console.log('Max concurrent: ' + MAX_CONCURRENT);
  console.log('Routes: /health /ready /metrics /run-manifest /pipeline/execute /pipeline/status/:id');
});
