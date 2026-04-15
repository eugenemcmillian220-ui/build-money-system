import { NextRequest, NextResponse } from 'next/server';
import { ideaValidator } from '@/lib/idea-validator';
import { security } from '@/lib/security';
import { requireAuth, isAuthError } from "@/lib/api-auth";

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
    const validation = ideaValidator.validateIdea(sanitizedIdea);
    const market = ideaValidator.analyzeMarket(sanitizedIdea);
    const risks = ideaValidator.assessRisks(sanitizedIdea);

    return NextResponse.json({ success: true, data: { validation, market, risks } });
  } catch (error) {
    console.error('Validate Idea Error:', error);
    return NextResponse.json({ error: 'Failed to validate idea' }, { status: 500 });
  }
}
