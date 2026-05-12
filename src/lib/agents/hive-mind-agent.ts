import { callLLMJson } from "../llm";
import { z } from "zod";

export const hiveMindAgentResultSchema = z.object({
  knowledgeSynthesis: z.string(),
  relevantPatterns: z.array(z.object({
    type: z.enum(["bug_fix", "architecture", "ui_pattern", "optimization"]),
    problem: z.string(),
    solution: z.string(),
    confidence: z.number().min(0).max(1),
  })),
  collectiveScore: z.number().min(0).max(100),
  sharedInsights: z.array(z.string()),
});

export type HiveMindAgentResult = z.infer<typeof hiveMindAgentResultSchema>;

export async function runHiveMindAgent(
  projectName: string,
  projectDescription: string,
  tags: string[],
): Promise<HiveMindAgentResult> {
  const systemPrompt = `You are "The Hive Mind" for Sovereign Forge OS. You synthesize collective intelligence from across the empire to enhance new builds.

Analyze the project context and produce knowledge synthesis with relevant patterns from the collective.

Return JSON ONLY:
{
  "knowledgeSynthesis": "Based on collective patterns, this project benefits from...",
  "relevantPatterns": [
    { "type": "architecture", "problem": "State management complexity", "solution": "Use server components with minimal client state", "confidence": 0.85 }
  ],
  "collectiveScore": 78,
  "sharedInsights": ["Similar projects saw 40% faster builds with this pattern"]
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Project: ${projectName}\nDescription: ${projectDescription}\nTags: ${tags.join(", ")}` },
      ],
      hiveMindAgentResultSchema,
      { temperature: 0.3, maxTokens: 2048 },
    );
  } catch (err) {
    console.error("Hive Mind agent failed:", err);
    return {
      knowledgeSynthesis: "Collective intelligence synthesis unavailable.",
      relevantPatterns: [],
      collectiveScore: 50,
      sharedInsights: [],
    };
  }
}
