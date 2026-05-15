import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { createManifestation } from "@/lib/manifest/store";
import { triggerStage } from "@/lib/manifest/chain";
import { userCanAccessOrg } from "@/lib/manifest/org-access";

interface ManifestationHandlerOptions {
  maxDuration: number;
  includeStatusUrl?: boolean;
}

export async function handleManifestationRequest(
  request: NextRequest,
  options: ManifestationHandlerOptions
) {
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
  const { prompt, orgId, options: manifestationOptions } = body as {
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
    options: manifestationOptions ?? {},
  });

  const baseUrl = new URL(request.url).origin;
  // Fire-and-forget: first stage runs in its own serverless invocation.
  if (!process.env.WORKER_SHARED_SECRET && process.env.NODE_ENV === "production") {
    console.error("[manifest/handler] WORKER_SHARED_SECRET is not set. Inter-stage calls will fail.");
    // Optionally, return an error response or fallback to a different mechanism
  }
  triggerStage(baseUrl, "intent-classify", row.id);

  const response: Record<string, unknown> = {
    jobId: row.id,
    status: row.status,
  };

  if (options.includeStatusUrl) {
    response.statusUrl = `${baseUrl}/api/manifest/status?jobId=${row.id}`;
  }

  return NextResponse.json(response);
}
