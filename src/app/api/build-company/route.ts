export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server';
import { companyOrchestrator } from '@/lib/company-orchestrator';
import { security } from '@/lib/security';
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { ok, fail } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return fail("UNAUTHORIZED", "Unauthorized access", 401);
    }

    const body = await req.json();
    const { idea } = body;

    if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
      return fail("VALIDATION_ERROR", "A non-empty idea string is required", 400);
    }

    const sanitizedIdea = security.sanitizeInput(idea);
    const result = await companyOrchestrator.buildCompany(sanitizedIdea);

    return ok(result);
  } catch (error) {
    console.error('Build Company Error:', error);
    return fail("BUILD_COMPANY_FAILED", "Failed to build company", 500);
  }
}
