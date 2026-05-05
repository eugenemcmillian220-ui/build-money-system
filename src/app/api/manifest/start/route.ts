import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { createManifestation } from "@/lib/manifest/store";
import { triggerStage } from "@/lib/manifest/chain";
import { userCanAccessOrg } from "@/lib/manifest/org-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success, limit, remaining, reset } = await rateLimit(ip, 5, 60000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Neural bridge cooling down." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      },
    );
  }

  const body = await request.json().catch(() => ({}));
  const { prompt, orgId, options } = body as {
    prompt?: string;
    orgId?: string;
    options?: Record<string, unknown>;
  };
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

  const userId = (authResult as { user?: { id?: string } }).user?.id ?? null;

  if (orgId) {
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const allowed = await userCanAccessOrg(userId, orgId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You do not have access to this organization." },
        { status: 403 },
      );
    }
  }

  const row = await createManifestation({
    orgId: orgId ?? null,
    userId,
    prompt,
    options: options ?? {},
  });

  const baseUrl = new URL(request.url).origin;
  triggerStage(baseUrl, "intent-classify", row.id);

  return NextResponse.json({ jobId: row.id, status: row.status });
}
