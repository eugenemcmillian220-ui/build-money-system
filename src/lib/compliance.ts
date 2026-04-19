// DA-040 FIX: TODO: Replace regex PII detection with a dedicated library (e.g., Presidio)
// Current regex patterns have high false-positive rate and miss many PII formats
import { FileMap } from "./types";

export interface PIIResult {
  detected: boolean;
  types: string[];
  count: number;
}

export interface ComplianceReport {
  projectId: string;
  pii: PIIResult;
  soc2: {
    dataEncryption: boolean;
    accessControl: boolean;
    auditLogs: boolean;
    passed: boolean;
  };
  gdpr: {
    privacyPolicy: boolean;
    dataDeletion: boolean;
    dataPortability: boolean;
    passed: boolean;
  };
  score: number;
  timestamp: string;
}

const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
  phoneNumber: /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
};

/**
 * Scan project files for sensitive information (PII)
 */
export function scanPII(files: FileMap): PIIResult {
  const types = new Set<string>();
  let count = 0;

  for (const content of Object.values(files)) {
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = content.match(pattern);
      if (matches) {
        types.add(type);
        count += matches.length;
      }
    }
  }

  return {
    detected: count > 0,
    types: Array.from(types),
    count,
  };
}

/**
 * Perform an automated compliance audit on a project
 */
export async function auditProject(projectId: string, files: FileMap): Promise<ComplianceReport> {
  const pii = scanPII(files);
  const filePaths = Object.keys(files);
  const combinedContent = Object.values(files).join("\n");

  const soc2 = {
    dataEncryption: combinedContent.includes("crypto") || combinedContent.includes("bcrypt") || combinedContent.includes("encrypt"),
    accessControl: combinedContent.includes("RLS") || combinedContent.includes("auth") || combinedContent.includes("permission"),
    auditLogs: combinedContent.includes("log") || combinedContent.includes("telemetry") || combinedContent.includes("audit"),
    passed: false,
  };
  soc2.passed = soc2.dataEncryption && soc2.accessControl && soc2.auditLogs;

  const gdpr = {
    privacyPolicy: filePaths.some(p => p.includes("privacy")),
    dataDeletion: combinedContent.includes("delete") || combinedContent.includes("remove"),
    dataPortability: combinedContent.includes("export") || combinedContent.includes("json"),
    passed: false,
  };
  gdpr.passed = gdpr.privacyPolicy && gdpr.dataDeletion && gdpr.dataPortability;

  let score = 0;
  if (soc2.passed) score += 50;
  if (gdpr.passed) score += 50;
  if (pii.detected) score -= 20;

  return {
    projectId,
    pii,
    soc2,
    gdpr,
    score: Math.max(0, Math.min(100, score)),
    timestamp: new Date().toISOString(),
  };
}
