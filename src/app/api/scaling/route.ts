export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { scalingEngine } from '@/lib/scaling';
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const metrics = scalingEngine.getMetrics();
    return NextResponse.json({ success: true, data: { metrics } });
  } catch (error) {
    console.error('Scaling GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve scaling metrics' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await req.json();
    const { action, direction, metrics } = body;

    if (action === 'check') {
      const check = scalingEngine.checkScaling(metrics || scalingEngine.getMetrics());
      return NextResponse.json({ success: true, data: check });
    }

    if (action === 'scale' && (direction === 'up' || direction === 'down')) {
      const newMetrics = await scalingEngine.scale(direction);
      return NextResponse.json({ success: true, data: { metrics: newMetrics } });
    }

    if (action === 'update' || action === 'reset') {
      const synced = await scalingEngine.syncWithPulse();
      return NextResponse.json({ success: true, data: { metrics: synced } });
    }

    return NextResponse.json({ error: 'Invalid action. Use: check, scale, update, or reset' }, { status: 400 });
  } catch (error) {
    console.error('Scaling POST Error:', error);
    return NextResponse.json({ error: 'Failed to process scaling request' }, { status: 500 });
  }
}
