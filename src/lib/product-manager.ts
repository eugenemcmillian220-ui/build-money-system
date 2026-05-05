import { FileMap, Project } from "./types";
import { cleanJson, callLLM } from "./llm";

export interface ABTestConfig {
  testName: string;
  hypothesis: string;
  metric: string;
  variants: {
    A: FileMap;
    B: FileMap;
  };
}

/**
 * AI Product Manager Agent: Generates A/B test variants to optimize metrics
 */
export class ProductManagerAgent {
  /**
   * Generates a "Variant B" (challenger) for a given project to optimize a specific goal
   */
  async generateVariant(project: Project, goal: string): Promise<ABTestConfig> {
    const systemPrompt = `You are an AI Product Manager. Your goal is to optimize the provided Next.js 15 project for a specific metric: "${goal}".
    
Generate a "Variant B" that tests a specific hypothesis (e.g., higher conversion, better engagement, clearer CTA).
Modify the existing project files to create this variant.

Return ONLY a JSON object:
{
  "testName": "Name of the test",
  "hypothesis": "Clear explanation of the hypothesis being tested",
  "metric": "${goal}",
  "files": {
    "path/to/modified/file.tsx": "new code here"
  }
}`;

    const filesSummary = Object.entries(project.files)
      .map(([path, content]) => `File: ${path}\n\`\`\`tsx\n${content}\n\`\`\``)
      .join("\n\n");

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `Current Project Files:\n${filesSummary}\n\nGoal: ${goal}\n\nGenerate Variant B:` }
    ];

    const response = await callLLM(messages, { temperature: 0.7, maxTokens: 8192, timeout: 25000 });
    const result = JSON.parse(cleanJson(response));

    return {
      testName: result.testName,
      hypothesis: result.hypothesis,
      metric: result.metric,
      variants: {
        A: project.files,
        B: { ...project.files, ...result.files }
      }
    };
  }
}

export const productManager = new ProductManagerAgent();
