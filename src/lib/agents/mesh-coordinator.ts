import { callLLMJson } from "../llm";
import { z } from "zod";

export const meshCoordinatorResultSchema = z.object({
  federationReadiness: z.number().min(0).max(100),
  availableResources: z.array(z.object({
    type: z.enum(["agent", "knowledge", "compute", "template"]),
    name: z.string(),
    description: z.string(),
    trustLevel: z.enum(["basic", "trusted", "allied", "sovereign"]),
  })),
  meshRecommendations: z.array(z.string()),
  interoperabilityScore: z.number().min(0).max(100),
});

export type MeshCoordinatorResult = z.infer<typeof meshCoordinatorResultSchema>;

export async function runMeshCoordinatorAgent(
  projectName: string,
  capabilities: string[],
): Promise<MeshCoordinatorResult> {
  const systemPrompt = `You are "The Mesh Coordinator" for Sovereign Forge OS. You manage federation and cross-empire resource sharing.

Assess the project's readiness for mesh federation and identify sharable resources.

Return JSON ONLY:
{
  "federationReadiness": 75,
  "availableResources": [
    { "type": "agent", "name": "Custom Analytics Agent", "description": "Specialized data pipeline agent", "trustLevel": "trusted" }
  ],
  "meshRecommendations": ["Enable cross-empire knowledge sharing", "Join analytics federation"],
  "interoperabilityScore": 80
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Project: ${projectName}\nCapabilities: ${capabilities.join(", ")}` },
      ],
      meshCoordinatorResultSchema,
      { temperature: 0.2, maxTokens: 1024 },
    );
  } catch (err) {
    console.error("Mesh Coordinator agent failed:", err);
    return {
      federationReadiness: 50,
      availableResources: [],
      meshRecommendations: [],
      interoperabilityScore: 50,
    };
  }
}
