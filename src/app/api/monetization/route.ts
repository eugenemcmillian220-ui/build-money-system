import { NextRequest, NextResponse } from 'next/server';
import { monetizationEngine } from '@/lib/monetization';
import { security } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !security.validateApiKey(authHeader.replace('Bearer ', ''))) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const idea = req.nextUrl.searchParams.get('idea') ?? req.nextUrl.searchParams.get('model') ?? 'saas product';
    const plan = await monetizationEngine.startMonetization(idea);

    return NextResponse.json({ success: true, data: { tiers: plan.tiers } });
  } catch (error) {
    console.error('Monetization GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve pricing tiers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !security.validateApiKey(authHeader.replace('Bearer ', ''))) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const body = await req.json();
    const { idea } = body;

    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return NextResponse.json({ error: 'A non-empty idea string is required' }, { status: 400 });
    }

    const sanitizedIdea = security.sanitizeInput(idea);
    const plan = await monetizationEngine.startMonetization(sanitizedIdea);

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('Monetization POST Error:', error);
    return NextResponse.json({ error: 'Failed to generate monetization plan' }, { status: 500 });
  }
}
