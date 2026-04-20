
// DA-025 FIX: Sanitize file paths to prevent traversal
function sanitizeFilePaths(files: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(files)) {
    const safePath = key.replace(/\.\.\//g, '').replace(/^\//, '');
    if (safePath && !safePath.includes('..')) {
      sanitized[safePath] = value;
    }
  }
  return sanitized;
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { aiDebugger } from '@/lib/ai-debugger';
import { security, SecurityError } from '@/lib/security';
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  // DA-003 FIX: Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'debug endpoint disabled in production' }, { status: 404 });
  }

  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const body = await req.json();
    const { files } = body;

    if (!files || typeof files !== 'object') {
      return NextResponse.json({ error: 'files object is required' }, { status: 400 });
    }

    // Analyze project for issues
    const reports = aiDebugger.analyzeProject(files);

    return NextResponse.json({ success: true, data: { reports } });
  } catch (error) {
    console.error('Debug POST Error:', error);
    if (error instanceof SecurityError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to analyze project' }, { status: 500 });
  }
}
