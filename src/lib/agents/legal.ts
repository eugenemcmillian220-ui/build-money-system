import { callLLMJson } from "../llm";
import { Project, legalResultSchema } from "../types";

export interface LegalVaultResult {
  patentDraft: string;
  tos: string;
  privacyPolicy: string;
  status: "drafted" | "filed" | "verified";
}

/**
 * Phase 17: The Legal Vault - Autonomous IP & Compliance Agent
 * This agent generates provisional patents, TOS, and Privacy Policies.
 */
export async function runLegalAgent(project: Project): Promise<LegalVaultResult> {
  const systemPrompt = `You are 'The Legal Vault', an autonomous IP and compliance specialist.
Your mission is to generate legally-binding documentation for: ${project.name || "Untitled Empire"}.

Project Description: ${project.description}
Protocol: ${project.manifest?.protocol || "saas"}

Generate:
1. A provisional 'Patent Draft' for the core logic and manifestation.
2. Custom 'Terms of Service' (TOS) based on the features and protocol.
3. A 'Privacy Policy' that covers the data handled by the manifestations.

Return JSON ONLY:
{
  "patentDraft": "...",
  "tos": "...",
  "privacyPolicy": "...",
  "status": "drafted"
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate IP and legal documents." }
      ],
      legalResultSchema,
      { temperature: 0.1 }
    );
  } catch (err) {
    console.error("Legal Agent failed:", err);
    return {
      patentDraft: "Patent draft pending manual review.",
      tos: "TOS pending manual review.",
      privacyPolicy: "Privacy Policy pending manual review.",
      status: "drafted"
    };
  }
}
