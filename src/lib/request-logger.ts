// src/lib/request-logger.ts
// Non-blocking request logging middleware < 2ms overhead

import { NextResponse } from 'next/server';
import { createClient as createSvcClient } from '@supabase/supabase-js';

type Handler = (req: Request, ctx: unknown) => Promise<NextResponse>;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSvcClient(url, key, { auth: { persistSession: false } });
}

export function withLogging(handler: Handler, path: string): Handler {
  return async (req: Request, ctx: unknown): Promise<NextResponse> => {
    const start = Date.now();
    let status = 500;

    try {
      const res = await handler(req, ctx);
      status = res.status;
      return res;
    } finally {
      const duration = Date.now() - start;
      // Non-blocking — fire and forget
      setImmediate(() => {
        const supabase = getSupabase();
        if (!supabase) return;
        void (async () => {
          try {
            await supabase.from('request_logs').insert({
              method: req.method,
              path,
              status_code: status,
              duration_ms: duration,
            });
          } catch { /* non-blocking */ }
        })();
      });
    }
  };
}
