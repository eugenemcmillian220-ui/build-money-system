import { callLLMJson } from "../llm";
import { z } from "zod";

export const pulseMonitorResultSchema = z.object({
  healthScore: z.number().min(0).max(100),
  anomalies: z.array(z.object({
    metric: z.string(),
    severity: z.enum(["low", "medium", "high", "critical"]),
    description: z.string(),
    suggestedAction: z.string(),
  })),
  telemetrySummary: z.object({
    errorRate: z.string(),
    avgResponseTime: z.string(),
    activeUsers: z.string(),
    conversionRate: z.string(),
  }),
  predictions: z.array(z.string()),
});

export type PulseMonitorResult = z.infer<typeof pulseMonitorResultSchema>;

export async function runPulseMonitorAgent(
  projectName: string,
  projectDescription: string,
): Promise<PulseMonitorResult> {
  const systemPrompt = `You are "The Pulse Monitor" for Sovereign Forge OS. You analyze telemetry data and predict system health trends.

Assess the project's observability posture and provide predictive health analysis.

Return JSON ONLY:
{
  "healthScore": 88,
  "anomalies": [
    { "metric": "error_rate", "severity": "medium", "description": "Error spike in auth module", "suggestedAction": "Add retry logic to auth flow" }
  ],
  "telemetrySummary": {
    "errorRate": "0.2%",
    "avgResponseTime": "145ms",
    "activeUsers": "1,200",
    "conversionRate": "3.4%"
  },
  "predictions": ["Error rate trending down", "Response times stable"]
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Project: ${projectName}\nDescription: ${projectDescription}` },
      ],
      pulseMonitorResultSchema,
      { temperature: 0.2, maxTokens: 1024 },
    );
  } catch (err) {
    console.error("Pulse Monitor agent failed:", err);
    return {
      healthScore: 70,
      anomalies: [],
      telemetrySummary: {
        errorRate: "N/A",
        avgResponseTime: "N/A",
        activeUsers: "N/A",
        conversionRate: "N/A",
      },
      predictions: [],
    };
  }
}
