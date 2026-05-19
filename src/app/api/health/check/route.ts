export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const target = new URL("/api/health", request.url);
  const response = NextResponse.redirect(target, 307);
  response.headers.set("X-Deprecated-Endpoint", "true");
  response.headers.set("X-Replacement-Endpoint", "/api/health");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
