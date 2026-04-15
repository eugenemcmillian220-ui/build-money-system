import { NextRequest, NextResponse } from 'next/server';
import { growthEngine } from '@/lib/growth-engine';
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

    const idea = req.nextUrl.searchParams.get('idea');
    if (!idea || idea.trim().length === 0) {
      return NextResponse.json({ error: 'An idea query parameter is required' }, { status: 400 });
    }

    const sanitizedIdea = security.sanitizeInput(idea);
    const strategy = await growthEngine.launchGrowth(sanitizedIdea);

    return NextResponse.json({ success: true, data: { channels: strategy.channels } });
  } catch (error) {
    console.error('Growth GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve growth channels' }, { status: 500 });
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
    const { idea } = body;

    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return NextResponse.json({ error: 'A non-empty idea string is required' }, { status: 400 });
    }

    const sanitizedIdea = security.sanitizeInput(idea);
    const strategy = growthEngine.launchGrowth(sanitizedIdea);

    return NextResponse.json({ success: true, data: strategy });
  } catch (error) {
    console.error('Growth POST Error:', error);
    return NextResponse.json({ error: 'Failed to launch growth strategy' }, { status: 500 });
  }
}
