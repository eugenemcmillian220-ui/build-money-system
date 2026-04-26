import { Project } from "@/lib/types";
import { callLLMJson } from "@/lib/llm";
import { z } from "zod";

export const overseerResultSchema = z.object({
  status: z.enum(["pass", "fail"]),
  score: z.number().min(0).max(100),
  testSteps: z.array(z.object({
    step: z.string(),
    result: z.enum(["success", "failure"]),
    latency: z.number(),
    error: z.string().optional()
  })),
  visualRegressions: z.array(z.string()),
  performanceBottlenecks: z.array(z.string()),
  summary: z.string()
});

export type OverseerResult = z.infer<typeof overseerResultSchema>;

export async function runOverseerAgent(project: Project): Promise<OverseerResult> {
  const systemPrompt = `
    You are "The Overseer", the Absolute Dominance QA Agent for Sovereign Forge OS (2026).
    Your mission is to perform a virtual E2E browser test of the following project.
    
    PROJECT: ${project.description}
    MANIFEST: ${JSON.stringify(project.manifest)}
    FILES: ${Object.keys(project.files || {}).join(", ")}
    
    You must simulate a browser navigation through the primary user flows:
    1. Landing Page conversion.
    2. Authentication flow.
    3. Core feature execution.
    4. Mobile responsiveness.
    
    Analyze the code structure for potential race conditions, hydration errors, or missing error boundaries.
    
    Return a structured JSON report.
  `;

  try {
    return await callLLMJson([
      { role: "system", content: systemPrompt },
      { role: "user", content: "Perform full E2E browser audit and visual regression simulation." }
    ], overseerResultSchema);
  } catch (err) {
    console.error("Overseer Agent failed:", err);
    return {
      status: "fail",
      score: 0,
      testSteps: [{ step: "Initialization", result: "failure", latency: 0, error: "Overseer neural link error — manual QA required." }],
      visualRegressions: [],
      performanceBottlenecks: [],
      summary: "Overseer agent encountered a neural link error. Manual QA audit required."
    };
  }
}
