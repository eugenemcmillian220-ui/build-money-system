import { callLLMJson } from "../llm";
import { FileMap, chroniclerResultSchema } from "../types";

export type ProjectDocs = {
  readme: string;
  architecture: string;
  apiDocs: string;
} & Record<string, unknown>;

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
