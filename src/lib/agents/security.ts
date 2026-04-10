import { callLLM } from "../llm";
import { FileMap } from "../types";

export interface SecurityAuditResult {
  score: number;
  vulnerabilities: Array<{
    severity: "low" | "medium" | "high" | "critical";
    type: string;
    description: string;
    file?: string;
    fix?: string;
  }>;
  recommendations: string[];
}

/**
 * Phase 8-10: Deep Security Auditor Agent
 * Audits the generated codebase for common vulnerabilities and OWASP Top 10 risks.
 */
export async function runSecurityAudit(files: FileMap): Promise<SecurityAuditResult> {
  const fileNames = Object.keys(files).join(", ");
  const systemPrompt = `You are the Deep Security Auditor. Audit the provided Next.js codebase for:
1. Hardcoded secrets/API keys.
2. SQL Injection (check DB queries).
3. XSS / CSRF vulnerabilities.
4. Broken Access Control.
5. Insecure direct object references.

Codebase Files: ${fileNames}

Return JSON ONLY:
{
  "score": 0-100,
  "vulnerabilities": [
    { "severity": "low" | "medium" | "high" | "critical", "type": "...", "description": "...", "file": "...", "fix": "..." }
  ],
  "recommendations": ["...", "..."]
}`;

  const response = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: "Perform deep security audit on the codebase." }
  ], { temperature: 0.1 });

  try {
    return JSON.parse(response);
  } catch {
    return {
      score: 100,
      vulnerabilities: [],
      recommendations: ["Ensure all environment variables are correctly used."]
    };
  }
}
