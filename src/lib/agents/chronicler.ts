import { callLLMJson } from "../llm";
import { FileMap, chroniclerResultSchema } from "../types";

export type ProjectDocs = {
  readme: string;
  architecture: string;
  apiDocs: string;
  userGuide?: string;
} & Record<string, unknown>;

export async function runChroniclerAgent(files: FileMap): Promise<ProjectDocs> {
  const fileNames = Object.keys(files).join(", ");
  const systemPrompt = `You are "The Chronicler", the Documentation & Knowledge Lead for Sovereign Forge OS (2026).
    Generate comprehensive, production-grade documentation for the provided codebase.
    
    Your documentation must include:
    1. README.md: A high-level overview, setup instructions, features, and deployment guide.
    2. ARCHITECTURE.md: A deep dive into the technical design, data flow, component hierarchy, and database schema.
    3. API_REFERENCE.md: Detailed documentation of all API routes, including request/response shapes, server actions, and auth requirements.
    4. USER_GUIDE.md: Instructions for end-users on how to use the application effectively.
    
    Files analyzed: ${fileNames}
    
    Return JSON ONLY:
    {
      "readme": "Markdown content for README.md",
      "architecture": "Markdown content for ARCHITECTURE.md",
      "apiDocs": "Markdown content for API_REFERENCE.md",
      "userGuide": "Markdown content for USER_GUIDE.md"
    }`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate docs based on the codebase." }
      ],
      chroniclerResultSchema,
      { temperature: 0.2 }
    );
  } catch (err) {
    console.error("Chronicler parse failed, falling back to defaults.", err);
    return {
      readme: "# New Project\nDocumentation pending.",
      architecture: "Next.js App Router Architecture.",
      apiDocs: "API endpoints defined in src/app/api."
    };
  }
}
