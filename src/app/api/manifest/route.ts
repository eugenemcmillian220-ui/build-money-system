// Backward-compat route: POST /api/manifest now delegates to the stage-based
// pipeline introduced in PR #92/#93. Each stage runs in its own 300s
// serverless invocation, so this entry-point only needs a short budget.
//
// Clients that need the full result synchronously should poll:
//   GET /api/manifest/status?jobId=<id>
import { NextRequest } from "next/server";
import { handleManifestationRequest } from "@/lib/api/manifestation-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Safe Hobby buffer — 280 s under the 300 s hard cap.
export const maxDuration = 280;

export async function POST(request: NextRequest) {
  return handleManifestationRequest(request, {
    maxDuration,
    includeStatusUrl: true,
  });
}
