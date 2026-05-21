import express from 'express';
import cors from 'cors';
import { executePipeline } from './pipeline/executor.js';
import { markFailed } from './pipeline/state.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.VERCEL_APP_URL, methods: ['POST', 'GET'] }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/pipeline/execute', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RAILWAY_INTERNAL_SECRET}`) {
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
    console.error(`Pipeline ${jobId} fatal error:`, err);
    await markFailed(jobId, err instanceof Error ? err.message : String(err));
  });
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`Railway pipeline server running on ${PORT}`));
