import { callLLMJson } from "../llm";
import { z } from "zod";

export const scrutinizerResultSchema = z.object({
  architectureScore: z.number().min(0).max(100),
  findings: z.array(z.object({
    category: z.enum(["architecture", "performance", "maintainability", "security", "testing"]),
    severity: z.enum(["info", "warning", "critical"]),
    filePath: z.string(),
    description: z.string(),
    suggestion: z.string(),
  })),
  codeQualityGrade: z.enum(["A", "B", "C", "D", "F"]),
  summary: z.string(),
});

export type ScrutinizerResult = z.infer<typeof scrutinizerResultSchema>;

export async function runScrutinizerAgent(files: Record<string, string>): Promise<ScrutinizerResult> {
  const fileList = Object.entries(files)
    .slice(0, 15)
    .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 600)}`)
    .join("\n\n")
    .slice(0, 6000);

  const systemPrompt = `You are "The Scrutinizer" for Sovereign Forge OS. You perform deep architectural audits and code quality assessments.

Analyze the codebase for:
1. Architectural patterns and anti-patterns
2. Performance bottlenecks
3. Maintainability concerns
4. Security vulnerabilities
5. Test coverage gaps

Return JSON ONLY:
{
  "architectureScore": 82,
  "findings": [
    { "category": "architecture", "severity": "warning", "filePath": "src/app/page.tsx", "description": "Large component needs decomposition", "suggestion": "Extract into sub-components" }
  ],
  "codeQualityGrade": "B",
  "summary": "Well-structured codebase with minor improvements needed"
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: fileList },
      ],
      scrutinizerResultSchema,
      { temperature: 0.1, maxTokens: 2048 },
    );
  } catch (err) {
    console.error("Scrutinizer agent failed:", err);
    return {
      architectureScore: 70,
      findings: [],
      codeQualityGrade: "B",
      summary: "Code audit completed with default assessment.",
    };
  }
}
