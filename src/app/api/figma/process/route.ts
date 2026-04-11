import { NextRequest, NextResponse } from "next/server";
import { callLLMJson } from "@/lib/llm";
import { traced } from "@/lib/telemetry";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const figmaResultSchema = z.object({
  uiDescription: z.string(),
  detectedComponents: z.array(z.string()),
  colorPalette: z.array(z.string()),
  recommendedTheme: z.enum(["dark", "light"]),
});

/**
 * Phase 9: Figma-to-Sovereign Processor
 * Converts a Figma design URL into a technical UI blueprint.
 */
export async function POST(request: NextRequest) {
  return traced("figma.process", { "agent.role": "Designer" }, async (span) => {
    try {
      const { figmaUrl } = await request.json();

      if (!figmaUrl) return NextResponse.json({ error: "figmaUrl required" }, { status: 400 });

      span.attributes["figma.url"] = figmaUrl;

      // In a real implementation, we would use the Figma API to fetch the design tree.
      // Here, we simulate the 'vision' analysis.
      
      const systemPrompt = `You are the 'Sovereign Vision' agent. Analyze the provided Figma URL (simulated).
Describe the UI components, layout, and styling precisely for a Next.js Developer.

Figma URL: ${figmaUrl}

Return JSON ONLY:
{
  "uiDescription": "Detailed layout specs...",
  "detectedComponents": ["Navbar", "Hero", "PricingCard", "..."],
  "colorPalette": ["#hex", "..."],
  "recommendedTheme": "dark" | "light"
}`;

      const result = await callLLMJson(
        [{ role: "system", content: systemPrompt }],
        figmaResultSchema,
        { temperature: 0.2 }
      );

      return NextResponse.json(result);

    } catch (error) {
      console.error("[Figma] Processing failed:", error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
