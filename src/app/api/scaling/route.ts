import { NextRequest, NextResponse } from 'next/server';
import { scalingSimulation } from '@/lib/scaling';

export async function GET() {
  try {
    const metrics = scalingSimulation.getMetrics();
    return NextResponse.json({ success: true, data: { metrics } });
  } catch (error) {
    console.error('Scaling GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve scaling metrics' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, direction, metrics } = body;

    if (action === 'check') {
      const check = scalingSimulation.checkScaling(metrics || scalingSimulation.getMetrics());
      return NextResponse.json({ success: true, data: check });
    }

    if (action === 'scale' && (direction === 'up' || direction === 'down')) {
      const newMetrics = scalingSimulation.scale(direction);
      return NextResponse.json({ success: true, data: { metrics: newMetrics } });
    }

    if (action === 'update') {
      scalingSimulation.updateMetrics(metrics || {});
      const updatedMetrics = scalingSimulation.getMetrics();
      return NextResponse.json({ success: true, data: { metrics: updatedMetrics } });
    }

    if (action === 'reset') {
      scalingSimulation.reset();
      const resetMetrics = scalingSimulation.getMetrics();
      return NextResponse.json({ success: true, data: { metrics: resetMetrics } });
    }

    return NextResponse.json({ error: 'Invalid action. Use: check, scale, update, or reset' }, { status: 400 });
  } catch (error) {
    console.error('Scaling POST Error:', error);
    return NextResponse.json({ error: 'Failed to process scaling request' }, { status: 500 });
  }
}
