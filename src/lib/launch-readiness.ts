import type { Project, ProjectManifest } from "./types";

export type LaunchStatus = "launch_ready" | "review_required" | "not_launch_ready";

export interface LaunchReadinessResult {
  status: LaunchStatus;
  label: string;
  reasons: string[];
}

export function evaluateLaunchReadiness(project: Project): LaunchReadinessResult {
  const manifest = project.manifest;
  const reasons: string[] = [];

  if (!manifest) {
    return {
      status: "not_launch_ready",
      label: "Not Launch Ready",
      reasons: ["No manifest data available."],
    };
  }

  const securityScore = (manifest.security as ProjectManifest["security"] & { score?: number })?.score ?? 0;
  const qaStatus = manifest.qa?.status;
  const vulnerabilities = (manifest.security as ProjectManifest["security"] & {
    vulnerabilities?: Array<{ severity: string }>;
  })?.vulnerabilities ?? [];

  const criticalCount = vulnerabilities.filter(
    (v) => v.severity === "critical",
  ).length;
  const highCount = vulnerabilities.filter(
    (v) => v.severity === "high",
  ).length;

  if (securityScore < 70) {
    reasons.push(`Security Score is ${securityScore} (minimum 70 for review, 80 for launch).`);
  } else if (securityScore < 80) {
    reasons.push(`Security Score is ${securityScore} (minimum 80 for launch).`);
  }

  if (criticalCount > 0) {
    reasons.push(`${criticalCount} critical security finding(s) must be resolved.`);
  }

  if (highCount > 0) {
    reasons.push(`${highCount} high-severity security finding(s) open.`);
  }

  if (qaStatus !== "pass") {
    reasons.push(`QA Audit status is "${qaStatus || "pending"}" (must be "pass").`);
  }

  // Determine tier
  if (
    securityScore >= 80 &&
    criticalCount === 0 &&
    highCount === 0 &&
    qaStatus === "pass"
  ) {
    return { status: "launch_ready", label: "Launch Ready", reasons: [] };
  }

  if (
    securityScore >= 70 &&
    criticalCount === 0
  ) {
    return { status: "review_required", label: "Review Required", reasons };
  }

  return { status: "not_launch_ready", label: "Not Launch Ready", reasons };
}
