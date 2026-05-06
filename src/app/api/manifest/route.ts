// Backward-compat route: POST /api/manifest now delegates to the stage-based
// pipeline introduced in PR #92/#93. Each stage runs in its own 300s
// serverless invocation, so this entry-point only needs a short budget.
//
// Clients that need the full result synchronously should poll:
//   GET /api/manifest/status?jobId=<id>
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { createManifestation } from "@/lib/manifest/store";
import { triggerStage } from "@/lib/manifest/chain";
import { userCanAccessOrg } from "@/lib/manifest/org-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safe Hobby buffer — 280 s under the 300 s hard cap.
export const maxDuration = 280;

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
  // Fire-and-forget: first stage runs in its own serverless invocation.
  triggerStage(baseUrl, "intent-classify", row.id);

  return NextResponse.json({
    jobId: row.id,
    status: row.status,
    // Clients poll this URL until status === "complete" | "failed"
    statusUrl: `${baseUrl}/api/manifest/status?jobId=${row.id}`,
  });
}
