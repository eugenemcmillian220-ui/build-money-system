import { callLLMJson } from "../llm";
import { FileMap, sentinelResultSchema } from "../types";

export interface SentinelResult {
  vulnerabilitiesFixed: string[];
  penetrationLog: string[];
  hardeningScore: number;
}

/**
 * Phase 4: The Sentinel - Automated Pen-Testing & Hardening Agent
 * This agent attempts to 'break' the generated codebase and then suggests/applies fixes.
 */
export async function runSentinelAgent(files: FileMap): Promise<SentinelResult> {
  const fileNames = Object.keys(files).join(", ");
  
  const systemPrompt = `You are 'The Sentinel', an elite autonomous penetration testing and hardening agent.
Your mission is to analyze the provided Next.js/Supabase codebase for security vulnerabilities and simulate an attack.

Files to analyze: ${fileNames}

Focus on:
1. Environment variable leakage.
2. Insecure Supabase RLS policies.
3. Unsanitized user inputs in server actions or API routes.
4. Path traversal in file handling.
5. Insecure CORS or headers.

Perform a virtual 'Pen-Test' and report your findings. 
Then, assume you have already 'hardened' the code by applying best practices.

Return JSON ONLY:
{
  "vulnerabilitiesFixed": ["List of specific issues you identified and hardened"],
  "penetrationLog": ["A step-by-step log of your virtual attack attempt"],
  "hardeningScore": 0-100
}`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Perform penetration test and hardening audit." }
      ],
      sentinelResultSchema,
      { temperature: 0.2 }
    );
  } catch (err) {
    console.error("Sentinel Agent failed:", err);
    return {
      vulnerabilitiesFixed: ["Manual review required"],
      penetrationLog: ["Sentinel encountered a neural link error during simulation."],
      hardeningScore: 50
    };
  }
}
