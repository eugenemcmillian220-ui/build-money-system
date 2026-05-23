import express from 'express';
import cors from 'cors';
import { executePipeline } from './pipeline/executor.js';
import { markFailed } from './pipeline/state.js';
import { createServiceClient } from './lib/supabase.js';

process.on('uncaughtException', (err) => { console.error('[FATAL] Uncaught:', err); process.exit(1); });
process.on('unhandledRejection', (r) => { console.error('[FATAL] Unhandled rejection:', r); process.exit(1); });

const app = express();
app.use(express.json({ limit: '1mb' }));

const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_APP_URL
  || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : undefined) || '*';
app.use(cors({ origin: allowedOrigin, methods: ['POST', 'GET'] }));

const MAX_CONCURRENT = Number(process.env.WORKER_MAX_CONCURRENCY ?? 3);
let inFlight = 0;

function authCheck(req: express.Request, res: express.Response): boolean {
  const secret = process.env.RAILWAY_INTERNAL_SECRET || process.env.WORKER_SHARED_SECRET;
  if (!req.headers.authorization || req.headers.authorization !== 'Bearer ' + secret) {
    res.status(401).json({ error: 'Unauthorized' }); return false;
  }
  return true;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', inFlight, maxConcurrent: MAX_CONCURRENT, timestamp: new Date().toISOString() });
});

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
});
