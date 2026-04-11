import { callLLMJson } from "../llm";
import { Project, phantomResultSchema } from "../types";

export type SimulationResult = {
  uxScore: number;
  frictionPoints: string[];
  recommendations: string[];
} & Record<string, unknown>;

export async function runPhantom(project: Project): Promise<SimulationResult> {
  const fileNames = Object.keys(project.files).join(", ");
  const systemPrompt = `You are The Phantom. Simulate a user session for this codebase.
Files: ${fileNames}
Identify UX friction points and provide a quality score (0-100).
Return JSON ONLY:
{
  "uxScore": 85,
  "frictionPoints": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Simulate user interaction." }
      ],
      phantomResultSchema,
      { temperature: 0.4 }
    );
  } catch (err) {
    console.error("Phantom parse failed, falling back to defaults.", err);
    return {
      uxScore: 0,
      frictionPoints: ["Unable to parse simulation result."],
      recommendations: ["Ensure LLM returns valid JSON."]
    };
  }
}
