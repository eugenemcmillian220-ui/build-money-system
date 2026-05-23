import { createServiceClient } from '../lib/supabase.js';

export async function markFailed(jobId: string, error: string) {
  const supabase = createServiceClient();
  await supabase.from('pipeline_jobs').update({ status: 'failed', error, updated_at: new Date().toISOString() }).eq('id', jobId);
}
