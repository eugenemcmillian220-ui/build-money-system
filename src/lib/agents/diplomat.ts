import { callLLMJson } from "../llm";
import { z } from "zod";

export const diplomatResultSchema = z.object({
  vendorAudit: z.array(z.object({
    vendor: z.string(),
    currentCost: z.string(),
    riskLevel: z.enum(["low", "medium", "high"]),
    recommendation: z.string(),
    projectedSavings: z.string(),
  })),
  totalProjectedSavings: z.string(),
  negotiationPriority: z.array(z.string()),
});

export type DiplomatResult = z.infer<typeof diplomatResultSchema>;

export async function runDiplomatAgent(
  projectDescription: string,
  currentStack: string[],
): Promise<DiplomatResult> {
  const systemPrompt = `You are "The Diplomat" for Sovereign Forge OS. You audit vendor relationships and negotiate optimal pricing.

Analyze the project's tech stack and vendor dependencies. Identify cost optimization opportunities.

Return JSON ONLY:
{
  "vendorAudit": [
    { "vendor": "Vercel", "currentCost": "$20/mo", "riskLevel": "low", "recommendation": "Evaluate Pro tier benefits", "projectedSavings": "$5/mo" }
  ],
  "totalProjectedSavings": "$50/mo",
  "negotiationPriority": ["Database hosting", "CDN costs"]
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Project: ${projectDescription}\nStack: ${currentStack.join(", ")}` },
      ],
      diplomatResultSchema,
      { temperature: 0.2, maxTokens: 2048 },
    );
  } catch (err) {
    console.error("Diplomat agent failed:", err);
    return {
      vendorAudit: [],
      totalProjectedSavings: "$0",
      negotiationPriority: [],
    };
  }
}
