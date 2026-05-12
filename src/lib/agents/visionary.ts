import { callLLMJson } from "../llm";
import { z } from "zod";

export const visionaryResultSchema = z.object({
  layoutAnalysis: z.string(),
  suggestedComponents: z.array(z.object({
    name: z.string(),
    type: z.enum(["page", "component", "layout"]),
    description: z.string(),
    estimatedLines: z.number(),
  })),
  designTokens: z.object({
    colors: z.array(z.string()),
    spacing: z.string(),
    typography: z.string(),
  }),
  confidence: z.number().min(0).max(1),
});

export type VisionaryResult = z.infer<typeof visionaryResultSchema>;

export async function runVisionaryAgent(description: string): Promise<VisionaryResult> {
  const systemPrompt = `You are "The Visionary" for Sovereign Forge OS. You analyze visual descriptions and design intentions to produce detailed component blueprints.

Given a description of a desired UI, produce a detailed component breakdown with design tokens.

Return JSON ONLY:
{
  "layoutAnalysis": "Two-column dashboard with sidebar navigation and main content area",
  "suggestedComponents": [
    { "name": "DashboardLayout", "type": "layout", "description": "Main layout wrapper", "estimatedLines": 45 }
  ],
  "designTokens": {
    "colors": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
    "spacing": "4px base unit, 8px grid",
    "typography": "Inter for body, JetBrains Mono for code"
  },
  "confidence": 0.9
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: description },
      ],
      visionaryResultSchema,
      { temperature: 0.3, maxTokens: 2048 },
    );
  } catch (err) {
    console.error("Visionary agent failed:", err);
    return {
      layoutAnalysis: "Standard responsive layout",
      suggestedComponents: [],
      designTokens: { colors: ["#000", "#fff"], spacing: "4px", typography: "Inter" },
      confidence: 0.3,
    };
  }
}
