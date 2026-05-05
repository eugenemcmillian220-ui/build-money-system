/**
 * AgentLedger – page.tsx
 * Main COGS Dashboard: real-time spend, provider breakdown, agent budgeting,
 * anomaly feed — all simulated with seeded demo data.
 */

"use client";

import { useEffect, useState, useCallback, useTransition } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface SpendEntry {
  id: string;
  provider: "openai" | "anthropic" | "groq";
  model: string;
  agentName: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ts: string;
}

interface AgentRow {
  id: string;
  name: string;
  role: string;
  provider: "openai" | "anthropic" | "groq";
  balance: number;
  monthlyBudget: number;
  dailySpend: number;
}

interface Anomaly {
  id: string;
  agentName: string;
  provider: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  costUsd: number;
  ts: string;
}

interface ProxyResult {
  provider: string;
  model: string;
  completion: string;
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
  timestamp: string;
}

// ─── Seed data helpers ─────────────────────────────────────────────────────
const PROVIDERS = ["openai", "anthropic", "groq"] as const;
const MODELS = {
  openai: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
  anthropic: ["claude-sonnet-4", "claude-haiku-4", "claude-opus-4"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
};
const AGENT_NAMES = [
  "Orion", "Nova", "Axon", "Prism", "Helix", "Quark", "Zeta", "Byte",
];
const ROLES = ["Architect", "Developer", "QA", "DataAnalyst", "SRE"];

function randBetween(a: number, b: number) {
  return Math.random() * (b - a) + a;
}
function fmtUsd(n: number) {
  return n < 0.001
    ? `$${(n * 1000).toFixed(3)}m`
    : n < 1
    ? `$${n.toFixed(4)}`
    : `$${n.toFixed(2)}`;
}
function fmtTs(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const PROVIDER_COLOR: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d4a574",
  groq: "#7c3aed",
};
const SEVERITY_COLOR: Record<string, string> = {
  low: "#facc15",
  medium: "#fb923c",
  high: "#f87171",
  critical: "#ef4444",
};

function generateSeededAgents(): AgentRow[] {
  return AGENT_NAMES.slice(0, 6).map((name, i) => ({
    id: `agent-${i}`,
    name,
    role: ROLES[i % ROLES.length],
    provider: PROVIDERS[i % 3],
    balance: randBetween(2, 18),
    monthlyBudget: [50, 30, 80, 40, 60, 25][i],
    dailySpend: randBetween(0.5, 6),
  }));
}

function generateSeededTransactions(n = 30): SpendEntry[] {
  return Array.from({ length: n }, (_, i) => {
    const provider = PROVIDERS[i % 3];
    const model = MODELS[provider][i % 3];
    const inputTokens = Math.floor(randBetween(200, 8000));
    const outputTokens = Math.floor(randBetween(80, 3000));
    const RATES: Record<string, { input: number; output: number }> = {
      "gpt-4o": { input: 2.5, output: 10 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
      "o3-mini": { input: 1.1, output: 4.4 },
      "claude-sonnet-4": { input: 3.0, output: 15 },
      "claude-haiku-4": { input: 0.8, output: 4 },
      "claude-opus-4": { input: 15, output: 75 },
      "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
      "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
      "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },
    };
    const rate = RATES[model] ?? { input: 1, output: 2 };
    const costUsd =
      (inputTokens / 1e6) * rate.input + (outputTokens / 1e6) * rate.output;
    return {
      id: `txn-${i}`,
      provider,
      model,
      agentName: AGENT_NAMES[i % AGENT_NAMES.length],
      inputTokens,
      outputTokens,
      costUsd,
      ts: new Date(Date.now() - (n - i) * 45_000).toISOString(),
    };
  });
}

function generateSeededAnomalies(): Anomaly[] {
  return [
    {
      id: "a1", agentName: "Orion", provider: "openai", severity: "critical",
      reason: "24h spend $54.20 exceeds $50 ceiling — automatic hard-stop triggered",
      costUsd: 54.2, ts: new Date(Date.now() - 120_000).toISOString(),
    },
    {
      id: "a2", agentName: "Nova", provider: "anthropic", severity: "high",
      reason: "Z-score 3.8 — single call cost spike detected ($0.28/call vs $0.04 avg)",
      costUsd: 0.28, ts: new Date(Date.now() - 540_000).toISOString(),
    },
    {
      id: "a3", agentName: "Axon", provider: "groq", severity: "low",
      reason: "Z-score 2.1 — unusual token count pattern on mixtral-8x7b",
      costUsd: 0.004, ts: new Date(Date.now() - 1_800_000).toISOString(),
    },
  ];
}

// ─── Sub-components ────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, accent,
}: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="card p-5 flex flex-col gap-1">
      <span style={{ color: "#8b949e", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "1.85rem", fontWeight: 700, color: accent ?? "#e6edf3", lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ fontSize: "0.78rem", color: "#6e7681" }}>{sub}</span>
    </div>
  );
}

function ProviderBar({ provider, spend, total }: { provider: string; spend: number; total: number }) {
  const pct = total > 0 ? (spend / total) * 100 : 0;
  const color = PROVIDER_COLOR[provider] ?? "#888";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between" style={{ fontSize: "0.8rem" }}>
        <span style={{ color: "#c9d1d9", textTransform: "capitalize", fontWeight: 600 }}>{provider}</span>
        <span style={{ color, fontWeight: 700 }}>{fmtUsd(spend)}</span>
      </div>
      <div style={{ background: "#21262d", borderRadius: 4, height: 8 }}>
        <div style={{ width: `${pct.toFixed(1)}%`, background: color, borderRadius: 4, height: "100%", transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: "0.7rem", color: "#6e7681" }}>{pct.toFixed(1)}% of total</span>
    </div>
  );
}

function BudgetGauge({ agent }: { agent: AgentRowExtended }) {
  const pct = Math.min(100, (agent.dailySpend / agent.dailyBudgetLocal) * 100);
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f97316" : "#22c55e";
  const provColor = PROVIDER_COLOR[agent.provider] ?? "#888";
  return (
    <div className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid #21262d" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: `${provColor}22`, border: `2px solid ${provColor}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.65rem", fontWeight: 700, color: provColor, flexShrink: 0,
      }}>
        {agent.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#c9d1d9" }}>{agent.name}</span>
          <span style={{ fontSize: "0.72rem", color: "#8b949e" }}>{agent.role}</span>
        </div>
        <div style={{ background: "#21262d", borderRadius: 4, height: 5, marginTop: 4 }}>
          <div style={{ width: `${pct}%`, background: color, borderRadius: 4, height: "100%", transition: "width 0.6s ease" }} />
        </div>
        <div className="flex justify-between mt-1">
          <span style={{ fontSize: "0.68rem", color: "#6e7681" }}>
            {fmtUsd(agent.dailySpend)} / {fmtUsd(agent.dailyBudgetLocal)} today
          </span>
          <span style={{ fontSize: "0.68rem", color, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

// Extend AgentRow with local daily budget
interface AgentRowExtended extends AgentRow {
  dailyBudgetLocal: number;
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function AgentLedgerDashboard() {
  const [transactions, setTransactions] = useState<SpendEntry[]>([]);
  const [agents, setAgents] = useState<AgentRowExtended[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [proxyResult, setProxyResult] = useState<ProxyResult | null>(null);
  const [proxyPrompt, setProxyPrompt] = useState("Summarize Q1 AI spend across all agents");
  const [proxyProvider, setProxyProvider] = useState<"openai" | "anthropic" | "groq">("openai");
  const [proxyModel, setProxyModel] = useState("gpt-4o-mini");
  const [isPending, startTransition] = useTransition();
  const [liveMode, setLiveMode] = useState(true);

  // Seed state on mount
  useEffect(() => {
    const txns = generateSeededTransactions(30);
    const agts = generateSeededAgents().map((a) => ({
      ...a, dailyBudgetLocal: a.monthlyBudget / 20,
    }));
    setTransactions(txns);
    setAgents(agts);
    setAnomalies(generateSeededAnomalies());
  }, []);

  // Live simulation: add a new transaction every 4s when liveMode is on
  const pushLiveTxn = useCallback(() => {
    const i = Math.floor(Math.random() * 9);
    const provider = PROVIDERS[i % 3];
    const model = MODELS[provider][i % 3];
    const inputTokens = Math.floor(randBetween(200, 5000));
    const outputTokens = Math.floor(randBetween(100, 2000));
    const RATES: Record<string, { input: number; output: number }> = {
      "gpt-4o": { input: 2.5, output: 10 }, "gpt-4o-mini": { input: 0.15, output: 0.6 },
      "o3-mini": { input: 1.1, output: 4.4 }, "claude-sonnet-4": { input: 3, output: 15 },
      "claude-haiku-4": { input: 0.8, output: 4 }, "claude-opus-4": { input: 15, output: 75 },
      "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
      "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
      "mixtral-8x7b-32768": { input: 0.24, output: 0.24 },
    };
    const rate = RATES[model] ?? { input: 1, output: 2 };
    const costUsd = (inputTokens / 1e6) * rate.input + (outputTokens / 1e6) * rate.output;
    const newTxn: SpendEntry = {
      id: `live-${Date.now()}`,
      provider, model, agentName: AGENT_NAMES[i % AGENT_NAMES.length],
      inputTokens, outputTokens, costUsd,
      ts: new Date().toISOString(),
    };
    setTransactions((prev) => [newTxn, ...prev.slice(0, 49)]);
    setAgents((prev) =>
      prev.map((a) =>
        a.name === newTxn.agentName
          ? { ...a, dailySpend: a.dailySpend + costUsd, balance: Math.max(0, a.balance - costUsd) }
          : a
      )
    );
  }, []);

  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(pushLiveTxn, 4000);
    return () => clearInterval(id);
  }, [liveMode, pushLiveTxn]);

  // KPI aggregations
  const totalSpend = transactions.reduce((s, t) => s + t.costUsd, 0);
  const providerSpend = PROVIDERS.reduce((acc, p) => {
    acc[p] = transactions.filter((t) => t.provider === p).reduce((s, t) => s + t.costUsd, 0);
    return acc;
  }, {} as Record<string, number>);
  const totalTokens = transactions.reduce((s, t) => s + t.inputTokens + t.outputTokens, 0);
  const avgCostPerCall = transactions.length > 0 ? totalSpend / transactions.length : 0;

  // Proxy test handler
  const handleProxyTest = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: proxyProvider, model: proxyModel, prompt: proxyPrompt }),
        });
        const data = await res.json();
        setProxyResult(data);
        // Add to live transactions
        if (data.usage) {
          const newTxn: SpendEntry = {
            id: `proxy-${Date.now()}`, provider: proxyProvider, model: proxyModel,
            agentName: "Demo", inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens, costUsd: data.usage.costUsd,
            ts: data.timestamp,
          };
          setTransactions((prev) => [newTxn, ...prev.slice(0, 49)]);
        }
      } catch {
        // swallow in demo mode
      }
    });
  };

  const unresolvedAnomalies = anomalies.filter((a) => a.severity === "critical" || a.severity === "high");

  return (
    <div style={{ minHeight: "100dvh", background: "#0d1117", color: "#e6edf3", fontFamily: "var(--font-sans, sans-serif)" }}>
      {/* ── Top bar ── */}
      <header style={{ background: "#161b22", borderBottom: "1px solid #30363d", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "1.4rem" }}>💰</span>
          <span style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "#e6edf3" }}>
            Agent<span style={{ color: "#7c6af6" }}>Ledger</span>
          </span>
          <span className="badge badge-blue" style={{ marginLeft: 8 }}>v1.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {unresolvedAnomalies.length > 0 && (
            <span className="badge badge-red" style={{ animation: "pulse 2s infinite" }}>
              ⚠ {unresolvedAnomalies.length} Alert{unresolvedAnomalies.length > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => setLiveMode((v) => !v)}
            style={{
              background: liveMode ? "#1a3d2b" : "#21262d",
              color: liveMode ? "#4ade80" : "#8b949e",
              border: `1px solid ${liveMode ? "#2ea043" : "#30363d"}`,
              borderRadius: 6, padding: "4px 12px", fontSize: "0.78rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            {liveMode ? "● LIVE" : "○ Paused"}
          </button>
          <span style={{ fontSize: "0.75rem", color: "#6e7681" }}>{transactions.length} transactions</span>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px 48px" }}>
        {/* ── KPI Row ── */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 24 }}>
          <KpiCard label="Total AI Spend" value={`$${totalSpend.toFixed(4)}`} sub={`${transactions.length} API calls`} accent="#7c6af6" />
          <KpiCard label="Total Tokens" value={(totalTokens / 1000).toFixed(1) + "K"} sub="input + output combined" />
          <KpiCard label="Avg Cost / Call" value={fmtUsd(avgCostPerCall)} sub="across all providers" />
          <KpiCard label="Active Agents" value={String(agents.filter((a) => a.dailySpend > 0).length)} sub={`of ${agents.length} total`} />
          <KpiCard label="Anomalies" value={String(anomalies.length)} sub={`${unresolvedAnomalies.length} unresolved`} accent={unresolvedAnomalies.length > 0 ? "#ef4444" : undefined} />
        </section>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Provider COGS Breakdown */}
            <div className="card p-5">
              <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
                📊 COGS by Provider
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {PROVIDERS.map((p) => (
                  <ProviderBar key={p} provider={p} spend={providerSpend[p] ?? 0} total={totalSpend} />
                ))}
              </div>
              {/* Model breakdown mini-table */}
              <div style={{ marginTop: 20, overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: "0.76rem", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ color: "#6e7681", textAlign: "left" }}>
                      <th style={{ paddingBottom: 8, fontWeight: 600 }}>Model</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600 }}>Provider</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: "right" }}>Calls</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: "right" }}>Tokens</th>
                      <th style={{ paddingBottom: 8, fontWeight: 600, textAlign: "right" }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      transactions.reduce((acc, t) => {
                        const k = t.model;
                        if (!acc[k]) acc[k] = { provider: t.provider, calls: 0, tokens: 0, cost: 0 };
                        acc[k].calls++;
                        acc[k].tokens += t.inputTokens + t.outputTokens;
                        acc[k].cost += t.costUsd;
                        return acc;
                      }, {} as Record<string, { provider: string; calls: number; tokens: number; cost: number }>)
                    )
                      .sort(([, a], [, b]) => b.cost - a.cost)
                      .slice(0, 8)
                      .map(([model, d]) => (
                        <tr key={model} style={{ borderTop: "1px solid #21262d" }}>
                          <td style={{ padding: "7px 0", color: "#c9d1d9", fontFamily: "var(--font-mono, monospace)", fontSize: "0.72rem" }}>{model}</td>
                          <td style={{ padding: "7px 4px" }}>
                            <span style={{ color: PROVIDER_COLOR[d.provider] ?? "#888", fontWeight: 600, fontSize: "0.7rem", textTransform: "capitalize" }}>
                              {d.provider}
                            </span>
                          </td>
                          <td style={{ padding: "7px 0", textAlign: "right", color: "#8b949e" }}>{d.calls}</td>
                          <td style={{ padding: "7px 0", textAlign: "right", color: "#8b949e" }}>{(d.tokens / 1000).toFixed(1)}K</td>
                          <td style={{ padding: "7px 0", textAlign: "right", color: "#e6edf3", fontWeight: 600 }}>{fmtUsd(d.cost)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Transaction Feed */}
            <div className="card p-5">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  ⚡ Live Transaction Feed
                </h2>
                {liveMode && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "#4ade80" }}>
                    <span style={{ width: 7, height: 7, background: "#4ade80", borderRadius: "50%", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                    Streaming
                  </span>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                {transactions.slice(0, 20).map((t, idx) => (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
                    background: idx === 0 && liveMode ? "#1c2a1e" : "transparent",
                    borderRadius: 6, transition: "background 1s ease",
                    fontSize: "0.76rem",
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: PROVIDER_COLOR[t.provider] ?? "#888", flexShrink: 0 }} />
                    <span style={{ color: "#8b949e", width: 56, flexShrink: 0 }}>{fmtTs(t.ts)}</span>
                    <span style={{ color: "#c9d1d9", fontWeight: 600, width: 56 }}>{t.agentName}</span>
                    <span style={{ color: PROVIDER_COLOR[t.provider] ?? "#888", width: 68, textTransform: "capitalize" }}>{t.provider}</span>
                    <span style={{ color: "#6e7681", fontFamily: "var(--font-mono, monospace)", fontSize: "0.68rem", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.model}</span>
                    <span style={{ color: "#8b949e", width: 60, textAlign: "right" }}>{((t.inputTokens + t.outputTokens) / 1000).toFixed(1)}K tok</span>
                    <span style={{ color: "#e6edf3", fontWeight: 700, width: 70, textAlign: "right" }}>{fmtUsd(t.costUsd)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* API Proxy Simulator */}
            <div className="card p-5">
              <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                🔀 Multi-Provider Proxy Simulator
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "#8b949e", display: "block", marginBottom: 4, fontWeight: 600 }}>PROVIDER</label>
                  <select
                    value={proxyProvider}
                    onChange={(e) => {
                      const p = e.target.value as "openai" | "anthropic" | "groq";
                      setProxyProvider(p);
                      setProxyModel(MODELS[p][0]);
                    }}
                    style={{ width: "100%", background: "#21262d", color: "#e6edf3", border: "1px solid #30363d", borderRadius: 6, padding: "8px 10px", fontSize: "0.82rem" }}
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "#8b949e", display: "block", marginBottom: 4, fontWeight: 600 }}>MODEL</label>
                  <select
                    value={proxyModel}
                    onChange={(e) => setProxyModel(e.target.value)}
                    style={{ width: "100%", background: "#21262d", color: "#e6edf3", border: "1px solid #30363d", borderRadius: 6, padding: "8px 10px", fontSize: "0.82rem" }}
                  >
                    {MODELS[proxyProvider].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: "0.72rem", color: "#8b949e", display: "block", marginBottom: 4, fontWeight: 600 }}>PROMPT</label>
                <textarea
                  value={proxyPrompt}
                  onChange={(e) => setProxyPrompt(e.target.value)}
                  rows={2}
                  style={{ width: "100%", background: "#21262d", color: "#e6edf3", border: "1px solid #30363d", borderRadius: 6, padding: "8px 10px", fontSize: "0.82rem", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <button
                onClick={handleProxyTest}
                disabled={isPending}
                style={{ background: isPending ? "#30363d" : "#7c6af6", color: "#fff", border: "none", borderRadius: 6, padding: "9px 20px", fontSize: "0.82rem", fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1 }}
              >
                {isPending ? "⏳ Routing…" : "▶ Send to Proxy"}
              </button>

              {proxyResult && (
                <div style={{ marginTop: 14, background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, padding: 12, fontSize: "0.76rem" }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ color: PROVIDER_COLOR[proxyResult.provider] ?? "#888", fontWeight: 700, textTransform: "capitalize" }}>{proxyResult.provider}/{proxyResult.model}</span>
                    <span style={{ color: "#8b949e" }}>In: {proxyResult.usage.inputTokens} tok</span>
                    <span style={{ color: "#8b949e" }}>Out: {proxyResult.usage.outputTokens} tok</span>
                    <span style={{ color: "#4ade80", fontWeight: 700 }}>Cost: {fmtUsd(proxyResult.usage.costUsd)}</span>
                  </div>
                  <p style={{ color: "#c9d1d9", fontFamily: "var(--font-mono, monospace)", lineHeight: 1.5, margin: 0, fontSize: "0.72rem" }}>
                    {proxyResult.completion}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Agent Budget Status */}
            <div className="card p-5">
              <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                🤖 Agent Budgets
              </h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {agents.map((a) => (
                  <BudgetGauge key={a.id} agent={a} />
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "10px 12px", background: "#21262d", borderRadius: 6, fontSize: "0.74rem", color: "#8b949e" }}>
                💡 Hard-stop policies prevent overspend. Configure in <code style={{ color: "#7c6af6", background: "#0d1117", padding: "1px 4px", borderRadius: 3 }}>budget_policies</code> table.
              </div>
            </div>

            {/* Anomaly Detection Feed */}
            <div className="card p-5">
              <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                🚨 Anomaly Detection
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {anomalies.map((a) => (
                  <div key={a.id} style={{
                    background: `${SEVERITY_COLOR[a.severity]}12`,
                    border: `1px solid ${SEVERITY_COLOR[a.severity]}44`,
                    borderRadius: 8, padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ color: SEVERITY_COLOR[a.severity], fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {a.severity}
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "#6e7681" }}>{fmtTs(a.ts)}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#c9d1d9", fontWeight: 600, marginBottom: 2 }}>
                      {a.agentName} <span style={{ color: PROVIDER_COLOR[a.provider] ?? "#888", textTransform: "capitalize", fontWeight: 400 }}>({a.provider})</span>
                    </div>
                    <p style={{ fontSize: "0.72rem", color: "#8b949e", margin: 0, lineHeight: 1.4 }}>{a.reason}</p>
                    <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.7rem", color: SEVERITY_COLOR[a.severity], fontWeight: 700 }}>{fmtUsd(a.costUsd)}</span>
                      <button
                        onClick={() => setAnomalies((prev) => prev.filter((x) => x.id !== a.id))}
                        style={{ fontSize: "0.68rem", color: "#6e7681", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
                {anomalies.length === 0 && (
                  <p style={{ color: "#4ade80", fontSize: "0.82rem", textAlign: "center", padding: "16px 0" }}>✅ No anomalies detected</p>
                )}
              </div>
            </div>

            {/* Schema Quick-Ref */}
            <div className="card p-5">
              <h2 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c9d1d9", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                🗄️ Supabase Schema
              </h2>
              {[
                { table: "agents", desc: "Credit balances, budgets" },
                { table: "agent_transactions", desc: "Per-call spend ledger" },
                { table: "budget_policies", desc: "Hard-stop rules" },
                { table: "anomalies", desc: "Flagged spend events" },
              ].map(({ table, desc }) => (
                <div key={table} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #21262d", fontSize: "0.76rem" }}>
                  <code style={{ color: "#7c6af6", fontFamily: "var(--font-mono, monospace)" }}>{table}</code>
                  <span style={{ color: "#6e7681" }}>{desc}</span>
                </div>
              ))}
              <div style={{ marginTop: 10 }}>
                <a href="/api/proxy" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.74rem", color: "#7c6af6", textDecoration: "none" }}>
                  → GET /api/proxy — provider info
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
