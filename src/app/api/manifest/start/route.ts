import { NextRequest } from "next/server";
import { handleManifestationRequest } from "@/lib/api/manifestation-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  return handleManifestationRequest(request, {
    maxDuration,
    includeStatusUrl: true,
  });
}
