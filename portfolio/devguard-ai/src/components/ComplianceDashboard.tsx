"use client";

// ─────────────────────────────────────────────────────────────────────────────
// DevGuard AI – Compliance Dashboard Component
// Full interactive UI: scan form + live report + SRE heal trigger
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import type { ComplianceReport, ComplianceFinding, Severity } from "@/lib/compliance";

// ─── Utilities ────────────────────────────────────────────────────────────────

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "bg-red-600 text-white",
  high:     "bg-orange-500 text-white",
  medium:   "bg-yellow-500 text-black",
  low:      "bg-blue-500 text-white",
  info:     "bg-gray-500 text-white",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-emerald-400",
  B: "text-green-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-500",
};

function Badge({ severity, label }: { severity: Severity; label?: string }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold uppercase", SEVERITY_COLORS[severity])}>
      {label ?? severity}
    </span>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn("h-2.5 w-2.5 rounded-full", ok ? "bg-emerald-400" : "bg-red-500")} />
      <span className="text-gray-300">{label}</span>
      <span className={cn("ml-auto text-xs font-semibold", ok ? "text-emerald-400" : "text-red-400")}>
        {ok ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = grade === "A" || grade === "B" ? "#34d399" : grade === "C" ? "#facc15" : "#f87171";

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg className="-rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={r} stroke="#1e293b" strokeWidth="10" fill="none" />
        <circle
          cx="56" cy="56" r={r}
          stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className={cn("text-3xl font-black", GRADE_COLORS[grade] ?? "text-white")}>{grade}</p>
        <p className="text-xs text-gray-400">{score}/100</p>
      </div>
    </div>
  );
}

// ─── Scan Form ────────────────────────────────────────────────────────────────

interface ScanFormProps {
  onReport: (report: ComplianceReport, scanId?: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

function ScanForm({ onReport, loading, setLoading }: ScanFormProps) {
  const [repo, setRepo] = useState("demo/demo");
  const [pr, setPr] = useState("1");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, prNumber: parseInt(pr, 10), token: token || undefined }),
      });
      const json = (await res.json()) as { report?: ComplianceReport; scanId?: string; error?: string };
      if (!res.ok || !json.report) throw new Error(json.error ?? "Scan failed");
      onReport(json.report, json.scanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleScan} className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-white">🔍 Scan a Pull Request</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 uppercase tracking-wider">Repository</span>
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="owner/repo"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 uppercase tracking-wider">PR Number</span>
          <input
            type="number" min="1"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="42"
            value={pr}
            onChange={(e) => setPr(e.target.value)}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400 uppercase tracking-wider">GitHub Token (optional)</span>
        <input
          type="password"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="ghp_... (leave blank for demo mode)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      {error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
          ⚠️ {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? (
          <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Scanning…</>
        ) : (
          "▶  Run Compliance Scan"
        )}
      </button>
    </form>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: ComplianceReport;
  scanId?: string;
}

function ReportCard({ report, scanId }: ReportCardProps) {
  const [healing, setHealing] = useState(false);
  const [healResult, setHealResult] = useState<string | null>(null);

  async function triggerHeal() {
    if (!scanId) { setHealResult("No scanId – DB not configured. Patch preview available above."); return; }
    setHealing(true);
    try {
      const res = await fetch("/api/heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
      const json = (await res.json()) as { message?: string; patchCount?: number };
      setHealResult(json.message ?? "Healing complete");
    } catch {
      setHealResult("⚠️ Healing request failed");
    } finally {
      setHealing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Compliance Report</h2>
          <p className="text-xs text-gray-500 mt-0.5">{new Date(report.timestamp).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={report.score} grade={report.grade} />
          <span
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold",
              report.passed ? "bg-emerald-800 text-emerald-200" : "bg-red-900 text-red-200",
            )}
          >
            {report.passed ? "✅ PASSED" : "❌ FAILED"}
          </span>
        </div>
      </div>

      {/* PII Summary */}
      {report.pii.detected && (
        <div className="rounded-xl border border-red-700/40 bg-red-950/30 p-4">
          <h3 className="font-semibold text-red-300 mb-2">🚨 PII Detected</h3>
          <div className="flex flex-wrap gap-2">
            {report.pii.types.map((t) => (
              <span key={t} className="rounded-full bg-red-800 px-2.5 py-0.5 text-xs text-red-100 font-medium">
                {t} ({report.pii.matches.filter((m) => m.type === t).length})
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-red-400">{report.pii.count} total PII instances detected – all values redacted in report.</p>
        </div>
      )}

      {/* SOC2 + GDPR Controls */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">SOC2 Controls</h3>
          <div className="flex flex-col gap-2">
            <StatusDot ok={report.soc2.dataEncryption}   label="Data Encryption" />
            <StatusDot ok={report.soc2.accessControl}    label="Access Control (RLS)" />
            <StatusDot ok={report.soc2.auditLogs}        label="Audit Logging" />
            <StatusDot ok={report.soc2.incidentResponse} label="Incident Response" />
            <StatusDot ok={report.soc2.changeManagement} label="Change Management" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">GDPR Controls</h3>
          <div className="flex flex-col gap-2">
            <StatusDot ok={report.gdpr.privacyPolicy}     label="Privacy Policy" />
            <StatusDot ok={report.gdpr.dataDeletion}      label="Right to Erasure" />
            <StatusDot ok={report.gdpr.dataPortability}   label="Data Portability" />
            <StatusDot ok={report.gdpr.consentManagement} label="Consent Management" />
          </div>
        </div>
      </div>

      {/* Findings */}
      {report.findings.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Findings ({report.findings.length})
          </h3>
          <div className="flex flex-col gap-3">
            {report.findings.map((f: ComplianceFinding) => (
              <div key={f.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">{f.id}</span>
                  <Badge severity={f.severity} />
                  <span className="text-xs text-slate-500 font-mono">{f.rule}</span>
                </div>
                <p className="text-sm text-white">{f.message}</p>
                <p className="mt-1 text-xs text-indigo-300">💡 {f.remediation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SRE Heal Button */}
      <div className="rounded-xl border border-indigo-700/40 bg-indigo-950/20 p-4">
        <h3 className="font-semibold text-indigo-300 mb-2">🤖 SRE Auto-Healing</h3>
        <p className="text-xs text-gray-400 mb-3">
          DevGuard can automatically generate remediation patches for each finding and open a fix PR.
        </p>
        {healResult ? (
          <p className="rounded-lg bg-emerald-900/40 border border-emerald-700 px-3 py-2 text-sm text-emerald-300">
            {healResult}
          </p>
        ) : (
          <button
            onClick={triggerHeal}
            disabled={healing || report.findings.length === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-indigo-600 disabled:opacity-40"
          >
            {healing ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Healing…</>
            ) : (
              `⚡ Auto-Heal ${report.findings.length} Finding${report.findings.length !== 1 ? "s" : ""}`
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard Export ────────────────────────────────────────────────────

export function ComplianceDashboard() {
  const [report, setReport]   = useState<ComplianceReport | null>(null);
  const [scanId, setScanId]   = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛡️</span>
            <span className="text-lg font-black tracking-tight text-white">DevGuard<span className="text-indigo-400"> AI</span></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-900/50 border border-emerald-700 px-3 py-1 text-xs text-emerald-300 font-medium">
              SOC2 Monitor
            </span>
            <span className="rounded-full bg-blue-900/50 border border-blue-700 px-3 py-1 text-xs text-blue-300 font-medium">
              GDPR
            </span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-white mb-3">
            Automated{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              SOC2 Compliance
            </span>{" "}
            for Next.js Startups
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Scan GitHub PRs for PII leaks, security vulnerabilities and compliance gaps.
            Get auto-healing patches in seconds.
          </p>
        </div>

        {/* Stats Row */}
        {report && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Score", value: `${report.score}/100`, color: "text-indigo-300" },
              { label: "PII Found", value: report.pii.count, color: report.pii.detected ? "text-red-400" : "text-emerald-400" },
              { label: "Findings", value: report.findings.length, color: report.findings.length > 0 ? "text-yellow-400" : "text-emerald-400" },
              { label: "Grade", value: report.grade, color: GRADE_COLORS[report.grade] ?? "text-white" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            <ScanForm
              onReport={(r, id) => { setReport(r); setScanId(id); }}
              loading={loading}
              setLoading={setLoading}
            />
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            {report ? (
              <ReportCard report={report} scanId={scanId} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center py-16">
                <span className="text-6xl">🔒</span>
                <p className="text-gray-400 text-sm max-w-xs">
                  Run a scan on the left to see your compliance report, PII analysis and auto-healing options.
                </p>
                <div className="flex flex-col gap-1 text-xs text-gray-600">
                  <span>✓ SOC2 Trust Service Criteria</span>
                  <span>✓ GDPR Art. 5 / 13 / 17 / 32</span>
                  <span>✓ PII Pattern Detection</span>
                  <span>✓ SRE Auto-Healing Patches</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
