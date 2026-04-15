import { NextRequest, NextResponse } from 'next/server';
import { analyticsEngine } from '@/lib/analytics';
import { security } from '@/lib/security';
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const name = searchParams.get('name') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const since = searchParams.get('since') ? Number(searchParams.get('since')) : undefined;
    const until = searchParams.get('until') ? Number(searchParams.get('until')) : undefined;

    const metrics = analyticsEngine.getMetrics({ name, category, userId, since, until });

    const from = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = until ? new Date(until) : new Date();
    const report = analyticsEngine.generateReport({ from, to });

    return NextResponse.json({ success: true, data: { metrics, report } });
  } catch (error) {
    console.error('Analytics GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve analytics' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const body = await req.json();
    const { name, value, unit, category, userId, metadata } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'A metric name is required' }, { status: 400 });
    }
    if (typeof value !== 'number') {
      return NextResponse.json({ error: 'A numeric metric value is required' }, { status: 400 });
    }

    const metric = analyticsEngine.trackMetric({ name, value, unit, category, userId, metadata });

    return NextResponse.json({ success: true, data: metric });
  } catch (error) {
    console.error('Analytics POST Error:', error);
    return NextResponse.json({ error: 'Failed to track metric' }, { status: 500 });
  }
}
