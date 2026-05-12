import { callLLMJson } from "../llm";
import { z } from "zod";

export const sculptorResultSchema = z.object({
  refinements: z.array(z.object({
    filePath: z.string(),
    changeType: z.enum(["style", "layout", "accessibility", "performance"]),
    description: z.string(),
    patch: z.string(),
  })),
  uiScore: z.number().min(0).max(100),
  accessibilityIssues: z.array(z.string()),
});

export type SculptorResult = z.infer<typeof sculptorResultSchema>;

export async function runSculptorAgent(files: Record<string, string>): Promise<SculptorResult> {
  const fileList = Object.entries(files)
    .filter(([p]) => p.endsWith(".tsx") || p.endsWith(".css"))
    .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 800)}`)
    .join("\n\n")
    .slice(0, 6000);

  const systemPrompt = `You are "The Sculptor" for Sovereign Forge OS. You refine and polish UI components for visual excellence.

Analyze the provided React/TSX files and suggest refinements for:
1. Visual consistency and spacing
2. Accessibility (ARIA labels, contrast, focus states)
3. Performance (lazy loading, memo, CSS optimization)
4. Layout responsiveness

Return JSON ONLY:
{
  "refinements": [
    { "filePath": "src/app/page.tsx", "changeType": "style", "description": "Add consistent spacing", "patch": "Updated className..." }
  ],
  "uiScore": 85,
  "accessibilityIssues": ["Missing alt text on hero image"]
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: fileList },
      ],
      sculptorResultSchema,
      { temperature: 0.2, maxTokens: 2048 },
    );
  } catch (err) {
    console.error("Sculptor agent failed:", err);
    return { refinements: [], uiScore: 70, accessibilityIssues: [] };
  }
}
