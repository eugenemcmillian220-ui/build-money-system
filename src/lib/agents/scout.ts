import { callLLMJson } from "../llm";
import { scoutResultSchema } from "../types";

export interface ScoutStrategy {
  strategyMarkdown: string;
  recommendedStack: string[];
  competitorInsights: string;
}

export async function runScoutAgent(prompt: string, protocol: string): Promise<ScoutStrategy> {
  const systemPrompt = `You are The Scout. Research and define the best technical and market strategy for: ${protocol}.
Provide a detailed markdown strategy and stack recommendations.
Return JSON ONLY:
{
  "strategyMarkdown": "...",
  "recommendedStack": ["...", "..."],
  "competitorInsights": "..."
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      scoutResultSchema,
      { temperature: 0.3 }
    );
  } catch (err) {
    console.error("Scout parse failed, falling back to defaults.", err);
    return {
      strategyMarkdown: "# Default Strategy\nBuild fast, iterate quickly.",
      recommendedStack: ["Next.js", "Tailwind", "Supabase"],
      competitorInsights: "No direct competitors identified."
    };
  }
}
