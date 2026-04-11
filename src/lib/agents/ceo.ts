import { z } from "zod";
import { callLLMJson } from "../llm";
import { Project } from "../types";

export const ceoReportSchema = z.object({
  empireHealth: z.number(),
  strategicTasks: z.array(z.object({
    priority: z.enum(["low", "medium", "high", "critical"]),
    task: z.string(),
    targetProjectId: z.string().optional(),
  })),
  revenueOptimization: z.string(),
  summary: z.string(),
});

export type CeoReport = z.infer<typeof ceoReportSchema>;

/**
 * Phase 20: The Autonomous CEO - Empire Management Agent
 */
export async function runCeoAgent(projects: Project[]): Promise<CeoReport> {
  const projectList = projects
    .map(p => `Project: ${p.name || "Untitled"} | Desc: ${p.description} | ROI: ${p.manifest?.economy?.agentRoi || "N/A"}`)
    .join("\n");

  const systemPrompt = `You are 'The Autonomous CEO', the ultimate meta-agent of the Sovereign Forge.
Your mission is to monitor the entire empire's health and dictate strategy for 2026.

Organization Portfolio:
${projectList || "No active projects identified."}

Analyze:
1. Empire Health: A 0-100 score based on portfolio diversification and ROI.
2. Strategic Tasks: Assign specific, high-impact tasks to improve growth.
3. Revenue Optimization: Suggest how to maximize profit (e.g., cross-selling, surge pricing).

Return JSON ONLY:
{
  "empireHealth": 0-100,
  "strategicTasks": [
    { "priority": "...", "task": "...", "targetProjectId": "..." }
  ],
  "revenueOptimization": "Strategic advice here.",
  "summary": "High-level empire summary."
}`;

  try {
    return await callLLMJson(
      [{ role: "system", content: systemPrompt }],
      ceoReportSchema,
      { temperature: 0.4 }
    );
  } catch (err) {
    console.error("CEO Agent failed:", err);
    return {
      empireHealth: 50,
      strategicTasks: [{ priority: "high", task: "Perform manual empire audit." }],
      revenueOptimization: "Unable to calculate strategy.",
      summary: "CEO agent encountered a neural link error."
    };
  }
}
