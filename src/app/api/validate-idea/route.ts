import { NextRequest, NextResponse } from 'next/server';
import { ideaValidator } from '@/lib/idea-validator';
import { security } from '@/lib/security';

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
    const validation = ideaValidator.validateIdea(sanitizedIdea);
    const market = ideaValidator.analyzeMarket(sanitizedIdea);
    const risks = ideaValidator.assessRisks(sanitizedIdea);

    return NextResponse.json({ success: true, data: { validation, market, risks } });
  } catch (error) {
    console.error('Validate Idea Error:', error);
    return NextResponse.json({ error: 'Failed to validate idea' }, { status: 500 });
  }
}
