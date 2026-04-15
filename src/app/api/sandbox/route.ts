export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { codeSandbox } from "@/lib/sandbox";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const sandboxRequestSchema = z.object({
  files: z.record(z.string()),
});

/**
 * POST /api/sandbox
 * Verify generated code in isolated sandbox environment
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = sandboxRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { files } = parsed.data;

    const result = await codeSandbox.verifyProject(files);

    return NextResponse.json({
      success: result.success,
      buildOutput: result.buildOutput,
      typeErrors: result.typeErrors,
      runtimeErrors: result.runtimeErrors,
    });
  } catch (error) {
    console.error("Sandbox verification error:", error);
    return NextResponse.json(
      { error: "Sandbox verification failed" },
      { status: 500 }
    );
  }
}
