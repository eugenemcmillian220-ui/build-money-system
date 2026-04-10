import { callLLM } from "../llm";
import { Project } from "../types";

export interface SimulationResult {
  uxScore: number;
  frictionPoints: string[];
  recommendations: string[];
}

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

  const response = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: "Simulate user interaction." }
  ], { temperature: 0.4 });

  try {
    return JSON.parse(response);
  } catch (e) {
    return {
      uxScore: 0,
      frictionPoints: ["Unable to parse simulation result."],
      recommendations: ["Ensure LLM returns valid JSON."]
    };
  }
}
