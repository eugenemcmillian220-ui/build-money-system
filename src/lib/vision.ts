import { callLLM, cleanJson } from "./llm";
import { AppSpec, ChatMessage } from "./types";

export interface VisionResult {
  spec: AppSpec;
  description: string;
}

/**
 * Process a visual input (image URL or base64) to generate a Next.js app specification
 */
export async function processVisualContext(imageUrl: string, prompt?: string): Promise<VisionResult> {
  const systemPrompt = `You are an expert UI/UX engineer and software architect. Analyze the provided image and create a detailed Next.js 15 application specification that reproduces this layout, design, and functionality.

Return a JSON object with this exact structure:
{
  "spec": {
    "name": "App Name",
    "description": "Brief description of the app",
    "features": ["feature 1", "feature 2"],
    "pages": [
      {
        "route": "/",
        "description": "What this page does",
        "components": ["Hero", "Features"]
      }
    ],
    "components": [
      {
        "name": "ComponentName",
        "description": "What this component does",
        "props": { "title": "string" }
      }
    ],
    "integrations": ["stripe", "supabase"],
    "schema": "SQL schema if database is needed",
    "fileStructure": ["app/page.tsx", "components/Hero.tsx"]
  },
  "description": "Detailed visual analysis of the UI, including colors, typography, spacing, and layout components"
}

Rules:
- Identify the primary brand colors (hex codes)
- Describe the typography and spacing (Tailwind classes)
- Map visual sections to reusable React components
- Infer data models from the UI elements
- Return ONLY valid JSON, no markdown fences`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: prompt || "Analyze this UI and generate a project specification:" },
        { type: "image_url", image_url: { url: imageUrl } }
      ]
    }
  ];

  // Using OpenCode Zen for vision capabilities
  const content = await callLLM(messages, { 
    model: "gpt-4o-zen", 
    temperature: 0.3, 
    maxTokens: 4096 
  });
  
  const cleaned = cleanJson(content);

  try {
    const parsed = JSON.parse(cleaned) as VisionResult;
    if (!parsed.spec || !parsed.description) {
      throw new Error("Invalid vision response: missing spec or description");
    }
    return parsed;
  } catch (e) {
    throw new Error(`Failed to parse vision JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}
