import express from 'express';
import cors from 'cors';
import { executePipeline } from './pipeline/executor.js';
import { markFailed } from './pipeline/state.js';

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

const app = express();
app.use(express.json());

const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL
  || process.env.VERCEL_APP_URL
  || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : undefined)
  || '*';

app.use(cors({ origin: allowedOrigin, methods: ['POST', 'GET'] }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/pipeline/execute', async (req, res) => {
  const authHeader = req.headers.authorization;
  const secret = process.env.RAILWAY_INTERNAL_SECRET || process.env.WORKER_SHARED_SECRET;
  if (!authHeader || authHeader !== 'Bearer ' + secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { jobId, userId, spec } = req.body as { jobId?: string; userId?: string; spec?: Record<string, unknown> };
  if (!jobId || !userId || !spec) {
    res.status(400).json({ error: 'Missing jobId, userId, or spec' });
    return;
  }
  res.status(202).json({ message: 'Pipeline started', jobId });
  executePipeline({ jobId, userId, spec }).catch(async (err) => {
    console.error('Pipeline ' + jobId + ' fatal error:', err);
    await markFailed(jobId, err instanceof Error ? err.message : String(err));
  });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, '0.0.0.0', () => {
  console.log('Railway pipeline server running on port ' + PORT);
  console.log('CORS origin: ' + allowedOrigin);
  console.log('Healthcheck: GET /health');
});
