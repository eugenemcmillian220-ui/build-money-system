import { NextRequest, NextResponse } from 'next/server';
import { companyOrchestrator } from '@/lib/company-orchestrator';
import { security } from '@/lib/security';

export async function POST(req: NextRequest) {
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
    const result = await companyOrchestrator.buildCompany(sanitizedIdea);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Build Company Error:', error);
    return NextResponse.json({ error: 'Failed to build company' }, { status: 500 });
  }
}
