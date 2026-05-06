export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { processVisualContext } from "@/lib/vision";
import { z } from "zod";


export const runtime = "nodejs";
export const maxDuration = 280;

const visionRequestSchema = z.object({
  imageUrl: z.string().url("Invalid image URL").optional(),
  base64Image: z.string().optional(),
  prompt: z.string().optional(),
});

/**
 * POST /api/vision
 * Generate app specification from visual input (screenshot/image)
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = visionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { imageUrl, base64Image, prompt } = parsed.data;

    if (!imageUrl && !base64Image) {
      return NextResponse.json(
        { error: "Either imageUrl or base64Image is required" },
        { status: 400 }
      );
    }

    // Process the visual input
    const result = await processVisualContext(
      imageUrl || `data:image/png;base64,${base64Image}`,
      prompt
    );

    return NextResponse.json({
      success: true,
      spec: result.spec,
      description: result.description,
    });
  } catch (error) {
    console.error("Vision processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vision processing failed" },
      { status: 500 }
    );
  }
}
