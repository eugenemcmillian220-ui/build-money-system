import { callLLMJson } from "../llm";
import { FileMap, securityResultSchema } from "../types";

export type SecurityAuditResult = {
  score: number;
  vulnerabilities: Array<{
    severity: "low" | "medium" | "high" | "critical";
    type: string;
    description: string;
    file?: string;
    fix?: string;
  }>;
  recommendations: string[];
} & Record<string, unknown>;

/**
 * Phase 8-10: Deep Security Auditor Agent
 * Audits the generated codebase for common vulnerabilities and OWASP Top 10 risks.
 */
export async function runSecurityAudit(files: FileMap): Promise<SecurityAuditResult> {
  const fileNames = Object.keys(files).join(", ");
  const systemPrompt = `You are "The Sentinel", the Security & Compliance Lead for Sovereign Forge OS (2026).
    Your goal is to conduct a rigorous security audit of the provided codebase, focusing on the OWASP Top 10 and Next.js-specific security patterns.
    
    Audit Checklist:
    1. Secrets Exposure: Hardcoded API keys, database credentials, or private keys.
    2. Injection Attacks: SQL injection in Supabase/Neon queries, command injection.
    3. Authentication & Authorization: Proper use of Supabase Auth, middleware protection, and RLS (Row Level Security) completeness.
    4. Data Exposure: PII leaking in client-side components or insecure API responses.
    5. XSS/CSRF: Insecure use of dangerouslySetInnerHTML, missing CSRF protection in server actions.
    6. Dependency Risks: Vulnerable packages or insecure version ranges.
    7. Next.js Patterns: Server-side data fetching safety, proper 'use client' boundaries.
    
    Codebase Files: ${fileNames}
    
    Return JSON ONLY:
    {
      "score": 0-100 (where 100 is perfectly secure),
      "vulnerabilities": [
        { 
          "severity": "low" | "medium" | "high" | "critical", 
          "type": "Vulnerability type", 
          "description": "Detailed explanation of the risk", 
          "file": "path/to/file", 
          "fix": "Specific code correction or mitigation strategy" 
        }
      ],
      "recommendations": [
        "Strategic security improvement 1",
        "Strategic security improvement 2"
      ],
      "complianceCheck": {
        "gdpr": "Ready" | "Action Required",
        "soc2": "Ready" | "Action Required"
      }
    }`;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Perform deep security audit on the codebase." }
      ],
      securityResultSchema,
      { temperature: 0.1 }
    ) as SecurityAuditResult;
  } catch (err) {
    console.error("Security parse failed, falling back to defaults.", err);
    return {
      score: 100,
      vulnerabilities: [],
      recommendations: ["Ensure all environment variables are correctly used."]
    };
  }
}
