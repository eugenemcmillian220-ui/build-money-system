// src/app/api/v1/health/route.ts
import { NextResponse } from 'next/server';
import { createClient as createSvcClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const start = Date.now();
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { status: 'degraded', db: 'not_configured', timestamp: new Date().toISOString() },
        { status: 200 }
      );
    }

    const supabase = createSvcClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from('user_credits').select('id').limit(1);
    const dbLatencyMs = Date.now() - start;

    if (error) {
      return NextResponse.json(
        { status: 'degraded', db: 'error', dbLatencyMs, error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      dbLatencyMs,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? 'unknown',
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', error: String(err) },
      { status: 503 }
    );
  }
}
