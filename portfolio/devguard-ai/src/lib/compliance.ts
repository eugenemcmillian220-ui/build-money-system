// ─────────────────────────────────────────────────────────────────────────────
// DevGuard AI – Compliance Engine
// Inspired by /workspace/build-money-system/src/lib/compliance.ts
// SOC2 + GDPR + PII scanner with enhanced pattern coverage
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface PIIMatch {
  type: string;
  value: string;          // redacted version for safe storage
  line: number;
  severity: Severity;
}

export interface PIIResult {
  detected: boolean;
  types: string[];
  count: number;
  matches: PIIMatch[];
}

export interface SOC2Controls {
  dataEncryption: boolean;
  accessControl: boolean;
  auditLogs: boolean;
  incidentResponse: boolean;
  changeManagement: boolean;
  passed: boolean;
}

export interface GDPRControls {
  privacyPolicy: boolean;
  dataDeletion: boolean;
  dataPortability: boolean;
  consentManagement: boolean;
  passed: boolean;
}

export interface ComplianceFinding {
  id: string;
  rule: string;
  severity: Severity;
  file: string;
  line?: number;
  message: string;
  remediation: string;
}

export interface ComplianceReport {
  projectId: string;
  prNumber?: number;
  pii: PIIResult;
  soc2: SOC2Controls;
  gdpr: GDPRControls;
  findings: ComplianceFinding[];
  score: number;            // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  passed: boolean;
  timestamp: string;
}

// ─── PII Detection Patterns ───────────────────────────────────────────────────

const PII_PATTERNS: Record<string, { regex: RegExp; severity: Severity }> = {
  email:          { regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,         severity: "high" },
  ssn:            { regex: /\b\d{3}-\d{2}-\d{4}\b/g,                                      severity: "critical" },
  creditCard:     { regex: /\b(?:\d[ -]?){13,16}\b/g,                                     severity: "critical" },
  phoneNumber:    { regex: /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,  severity: "high" },
  apiKey:         { regex: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[\w\-]{16,}/gi, severity: "critical" },
  awsAccessKey:   { regex: /AKIA[0-9A-Z]{16}/g,                                            severity: "critical" },
  ipAddress:      { regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,                                severity: "medium" },
  jwtToken:       { regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, severity: "critical" },
};

// ─── Redactor ─────────────────────────────────────────────────────────────────

export function redactPII(content: string): string {
  let redacted = content;
  for (const [type, { regex }] of Object.entries(PII_PATTERNS)) {
    redacted = redacted.replace(regex, `[REDACTED:${type.toUpperCase()}]`);
  }
  return redacted;
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

export function scanPII(files: Record<string, string>): PIIResult {
  const types = new Set<string>();
  const matches: PIIMatch[] = [];

  for (const [filename, content] of Object.entries(files)) {
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      for (const [type, { regex, severity }] of Object.entries(PII_PATTERNS)) {
        const localRegex = new RegExp(regex.source, regex.flags.replace("g", "") + "g");
        const found = line.match(localRegex);
        if (found) {
          types.add(type);
          found.forEach((v) => {
            matches.push({
              type,
              value: `[REDACTED:${type.toUpperCase()}]`,
              line: idx + 1,
              severity,
            });
          });
        }
      }
    });
    void filename; // used for context
  }

  return {
    detected: matches.length > 0,
    types: Array.from(types),
    count: matches.length,
    matches,
  };
}

// ─── SOC2 Checker ─────────────────────────────────────────────────────────────

function checkSOC2(combinedContent: string): SOC2Controls {
  const has = (terms: string[]) => terms.some((t) => combinedContent.toLowerCase().includes(t));
  const dataEncryption   = has(["crypto", "bcrypt", "encrypt", "aes-256", "tls", "https"]);
  const accessControl    = has(["rls", "auth", "permission", "rbac", "abac", "supabase.auth"]);
  const auditLogs        = has(["audit", "log", "telemetry", "sentry", "datadog", "pino"]);
  const incidentResponse = has(["incident", "alert", "pagerduty", "opsgenie", "sre"]);
  const changeManagement = has(["migration", "terraform", "iac", "semver", "changelog"]);
  const passed = dataEncryption && accessControl && auditLogs;
  return { dataEncryption, accessControl, auditLogs, incidentResponse, changeManagement, passed };
}

// ─── GDPR Checker ─────────────────────────────────────────────────────────────

function checkGDPR(combinedContent: string): GDPRControls {
  const has = (terms: string[]) => terms.some((t) => combinedContent.toLowerCase().includes(t));
  const privacyPolicy    = has(["privacy", "gdpr", "dpa", "privacy-policy"]);
  const dataDeletion     = has(["delete", "erasure", "right-to-be-forgotten", "purge"]);
  const dataPortability  = has(["export", "portability", "download", "data-export"]);
  const consentManagement = has(["consent", "cookie", "opt-in", "opt-out"]);
  const passed = privacyPolicy && dataDeletion;
  return { privacyPolicy, dataDeletion, dataPortability, consentManagement, passed };
}

// ─── Findings Builder ─────────────────────────────────────────────────────────

function buildFindings(
  pii: PIIResult,
  soc2: SOC2Controls,
  gdpr: GDPRControls,
): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  let idx = 0;

  // PII findings
  if (pii.detected) {
    const criticalPII = pii.types.filter((t) =>
      ["ssn", "creditCard", "apiKey", "awsAccessKey", "jwtToken"].includes(t),
    );
    if (criticalPII.length) {
      findings.push({
        id: `F${++idx}`,
        rule: "SOC2-CC6.1 / GDPR-Art.32",
        severity: "critical",
        file: "PR diff",
        message: `Critical PII detected: ${criticalPII.join(", ")}`,
        remediation: "Remove secrets immediately; rotate credentials; use environment variables.",
      });
    }
  }

  // SOC2 failures
  if (!soc2.dataEncryption) {
    findings.push({ id: `F${++idx}`, rule: "SOC2-CC6.7", severity: "high", file: "config", message: "No encryption primitives detected", remediation: "Add bcrypt/AES-256 for data at rest; enforce HTTPS." });
  }
  if (!soc2.accessControl) {
    findings.push({ id: `F${++idx}`, rule: "SOC2-CC6.2", severity: "high", file: "database", message: "Row Level Security (RLS) not detected", remediation: "Enable Supabase RLS policies on all tables." });
  }
  if (!soc2.auditLogs) {
    findings.push({ id: `F${++idx}`, rule: "SOC2-CC7.2", severity: "medium", file: "infra", message: "Audit logging not configured", remediation: "Integrate structured logging (pino/winston) + Sentry." });
  }

  // GDPR failures
  if (!gdpr.privacyPolicy) {
    findings.push({ id: `F${++idx}`, rule: "GDPR-Art.13", severity: "medium", file: "pages", message: "Privacy policy not referenced in codebase", remediation: "Add /privacy-policy route and link in footer." });
  }
  if (!gdpr.dataDeletion) {
    findings.push({ id: `F${++idx}`, rule: "GDPR-Art.17", severity: "high", file: "api", message: "No data deletion endpoint found", remediation: "Implement DELETE /api/user to support right-to-erasure." });
  }

  return findings;
}

// ─── Score Calculator ─────────────────────────────────────────────────────────

function calcScore(pii: PIIResult, soc2: SOC2Controls, gdpr: GDPRControls): number {
  let score = 100;
  if (pii.detected) score -= Math.min(40, pii.count * 5);
  if (!soc2.dataEncryption)   score -= 15;
  if (!soc2.accessControl)    score -= 15;
  if (!soc2.auditLogs)        score -= 10;
  if (!gdpr.privacyPolicy)    score -= 8;
  if (!gdpr.dataDeletion)     score -= 7;
  return Math.max(0, score);
}

function scoreToGrade(score: number): ComplianceReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ─── Main Audit Function ──────────────────────────────────────────────────────

export async function auditProject(
  projectId: string,
  files: Record<string, string>,
  prNumber?: number,
): Promise<ComplianceReport> {
  const combinedContent = Object.values(files).join("\n");
  const pii     = scanPII(files);
  const soc2    = checkSOC2(combinedContent);
  const gdpr    = checkGDPR(combinedContent);
  const findings = buildFindings(pii, soc2, gdpr);
  const score   = calcScore(pii, soc2, gdpr);

  return {
    projectId,
    prNumber,
    pii,
    soc2,
    gdpr,
    findings,
    score,
    grade: scoreToGrade(score),
    passed: score >= 75 && !pii.detected,
    timestamp: new Date().toISOString(),
  };
}
