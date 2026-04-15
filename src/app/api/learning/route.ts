export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { learningStore } from '@/lib/learning-store';
import { security, SecurityError } from '@/lib/security';
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
    const type = searchParams.get('type') ?? undefined;

    if (type) {
      const learningData = learningStore.findByType(type as 'pattern' | 'optimization' | 'preference' | 'error-fix');
      return NextResponse.json({ success: true, data: { learningData } });
    }

    const learningData = learningStore.getAllLearningData();
    const summary = learningStore.summarizeLearning();

    return NextResponse.json({ success: true, data: { learningData, summary } });
  } catch (error) {
    console.error('Learning GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve learning data' }, { status: 500 });
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
    const { source, type, content, impact } = body;

    if (!source || !['feedback', 'debugger', 'swarm'].includes(source)) {
      return NextResponse.json({ error: 'source must be one of: feedback, debugger, swarm' }, { status: 400 });
    }

    if (!type || !['pattern', 'optimization', 'preference', 'error-fix'].includes(type)) {
      return NextResponse.json({ error: 'type must be one of: pattern, optimization, preference, error-fix' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required and must be a string' }, { status: 400 });
    }

    if (!impact || !['low', 'medium', 'high'].includes(impact)) {
      return NextResponse.json({ error: 'impact must be one of: low, medium, high' }, { status: 400 });
    }

    const sanitizedContent = security.sanitizeInput(content);
    const learningData = await learningStore.addLearningData({
      source,
      type,
      content: sanitizedContent,
      impact,
    });

    return NextResponse.json({ success: true, data: learningData }, { status: 201 });
  } catch (error) {
    console.error('Learning POST Error:', error);
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add learning data' }, { status: 500 });
  }
}
