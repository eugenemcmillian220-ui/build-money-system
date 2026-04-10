import { callLLM } from "../llm";
import { FileMap } from "../types";

export interface ProjectDocs {
  readme: string;
  architecture: string;
  apiDocs: string;
}

export async function runChroniclerAgent(files: FileMap): Promise<ProjectDocs> {
  const fileNames = Object.keys(files).join(", ");
  const systemPrompt = `You are The Chronicler. Generate comprehensive documentation for this codebase.
Files: ${fileNames}
Return JSON ONLY:
{
  "readme": "...",
  "architecture": "...",
  "apiDocs": "..."
}`;

  const response = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: "Generate docs based on the codebase." }
  ], { temperature: 0.2 });

  try {
    return JSON.parse(response);
  } catch (e) {
    return {
      readme: "# New Project\nDocumentation pending.",
      architecture: "Next.js App Router Architecture.",
      apiDocs: "API endpoints defined in src/app/api."
    };
  }
}
