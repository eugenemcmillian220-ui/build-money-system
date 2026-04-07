"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PricingTable } from "@/components/billing/pricing-table";
import { ApprovalsTab } from "@/components/approvals-tab";
import { HiveDashboard } from "@/components/hive-dashboard";
import { DiplomatDashboard } from "@/components/diplomat-dashboard";
import { InvestorPortal } from "@/components/investor-portal";
import { MADealRoom } from "@/components/ma-deal-room";
import { RDLab } from "@/components/rd-lab";
import { EconomyDashboard } from "@/components/economy-dashboard";

// Types
interface Project {
  id: string;
  files: Record<string, string>;
  description?: string;
  timestamp?: number;
  schema?: string;
  integrations?: string[];
  createdAt: string;
  status?: {
    phase: string;
    currentPass: number;
    totalPasses: number;
    message: string;
  };
  deployment?: {
    id: string;
    url: string;
    status: string;
    createdAt: string;
  };
  githubRepo?: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  systems: {
    database: { status: string; message: string };
    openrouter: { status: string; message: string };
    vercel: { status: string; message: string };
    github: { status: string; message: string };
    admin: { status: string; message: string };
  };
  phases: Record<string, string>;
}

interface EndpointTest {
  name: string;
  method: string;
  endpoint: string;
  description: string;
}

const API_ENDPOINTS: EndpointTest[] = [
  { name: "Health Check", method: "GET", endpoint: "/api/health", description: "Check all system statuses" },
  { name: "Status", method: "GET", endpoint: "/api/status", description: "Integration availability status" },
  { name: "List Projects", method: "GET", endpoint: "/api/projects", description: "Get all projects" },
  { name: "Generate", method: "POST", endpoint: "/api/generate", description: "Generate component (requires prompt)" },
  { name: "Generate Advanced", method: "POST", endpoint: "/api/generate-advanced", description: "Advanced generation with planning" },
  { name: "Deploy", method: "POST", endpoint: "/api/deploy", description: "Deploy to Vercel (requires projectId)" },
  { name: "GitHub Export", method: "POST", endpoint: "/api/github", description: "Export to GitHub (requires projectId, repoName)" },
  { name: "Feedback", method: "GET", endpoint: "/api/feedback", description: "Get all feedback" },
  { name: "Analytics", method: "GET", endpoint: "/api/analytics", description: "Get analytics (requires auth)" },
  { name: "Validate Idea", method: "POST", endpoint: "/api/validate-idea", description: "Validate business idea (requires auth)" },
  { name: "Build Company", method: "POST", endpoint: "/api/build-company", description: "Build AI company (requires auth)" },
  { name: "Swarm", method: "POST", endpoint: "/api/swarm", description: "Multi-agent collaboration (requires auth)" },
  { name: "Self Improve", method: "POST", endpoint: "/api/self-improve", description: "Trigger self-improvement (requires auth)" },
  { name: "Ab Test", method: "POST", endpoint: "/api/ab-test", description: "Generate A/B test variant" },
  { name: "Compliance", method: "POST", endpoint: "/api/compliance", description: "Run compliance audit" },
  { name: "Evolve", method: "POST", endpoint: "/api/evolve", description: "Trigger self-evolution" },
  { name: "Hype", method: "POST", endpoint: "/api/hype", description: "Launch growth campaign" },
  { name: "Governance", method: "GET", endpoint: "/api/governance", description: "Check action status" },
  { name: "VC Propose", method: "POST", endpoint: "/api/vc/propose", description: "Propose VC investment" },
  { name: "Diplomat", method: "GET", endpoint: "/api/diplomat", description: "Run vendor audit" },
  { name: "Hive Sync", method: "POST", endpoint: "/api/hive/sync", description: "Sync with Hive Mind" },
  { name: "M&A Analyze", method: "POST", endpoint: "/api/ma/analyze", description: "Analyze synergies" },
];

const PHASE_NAMES: Record<string, { name: string; description: string }> = {
  phase1: { name: "Phase 1", description: "Single Component Generation" },
  phase2: { name: "Phase 2", description: "Multi-file App Generation" },
  phase3: { name: "Phase 3", description: "Database Persistence" },
  phase4: { name: "Phase 4", description: "Deployment & Export" },
  phase5: { name: "Phase 5", description: "Production Systems" },
  phase6: { name: "Phase 6", description: "AI Company Builder" },
  phase7: { name: "Phase 7", description: "Marketplace & Billing" },
  phase8: { name: "Phase 8", description: "AI Development OS" },
  phase9: { name: "Phase 9", description: "Autonomous Enterprise" },
  phase10: { name: "Phase 10", description: "Agent Economy" },
  phase11: { name: "Phase 11", description: "Growth Lab" },
  phase12: { name: "Phase 12", description: "Governance & Edge" },
  phase13: { name: "Phase 13", description: "Autonomous VC" },
  phase14: { name: "Phase 14", description: "Agentic Diplomacy" },
  phase15: { name: "Phase 15", description: "Hive Mind Loop" },
  phase16: { name: "Phase 16", description: "Autonomous M&A" },
  phase17: { name: "Phase 17", description: "Legal & Corporate Suite" },
  phase18: { name: "Phase 18", description: "R&D Tech Scouting" },
};

type ActiveTab = "projects" | "health" | "endpoints" | "billing" | "ai-tools" | "enterprise";
type EnterpriseView = "overview" | "economy" | "governance" | "vc" | "diplomat" | "hive" | "ma" | "rd";

const ENTERPRISE_FEATURES = [
  {
    phase: "Phase 8",
    title: "AI Development OS",
    icon: "🖥️",
    features: ["Live Code Sandbox (E2B)", "Multi-Tenant Workspaces", "Agent Memory & Recall", "Mobile App Generation", "Real-Time Collaboration", "Semantic Code Search", "Enterprise Auth & White-label"],
    color: "blue",
  },
  {
    phase: "Phase 9",
    title: "Autonomous Enterprise",
    icon: "🏢",
    features: ["Vision-to-Code Pipeline", "Compliance Vault (SOC2/GDPR)", "Auto-SRE Healing", "Multi-Cloud IaC (Terraform)"],
    color: "purple",
  },
  {
    phase: "Phase 10",
    title: "Agent Economy",
    icon: "💹",
    features: ["Agent Credit System", "Skills Marketplace", "Revenue Sharing", "Agent-to-Agent Transactions"],
    color: "green",
    view: "economy" as EnterpriseView,
  },
  {
    phase: "Phase 11",
    title: "Growth Lab",
    icon: "📈",
    features: ["Hype Agent (Viral Campaigns)", "Social Automation", "SEO Intelligence", "A/B Test Engine"],
    color: "amber",
  },
  {
    phase: "Phase 12",
    title: "Governance & Edge",
    icon: "🛡️",
    features: ["Human-in-the-Loop Approvals", "Edge Scale Orchestration", "Global CDN Deployment", "Risk Scoring Engine"],
    color: "red",
    view: "governance" as EnterpriseView,
  },
  {
    phase: "Phase 13",
    title: "Autonomous VC",
    icon: "🚀",
    features: ["AI Investment Engine", "Portfolio Management", "ROI Projection", "Revenue Share Intelligence"],
    color: "green",
    view: "vc" as EnterpriseView,
  },
  {
    phase: "Phase 14",
    title: "Agentic Diplomacy",
    icon: "💼",
    features: ["Vendor Relationship AI", "Automated Negotiations", "Contract Renewal", "Cost Optimization"],
    color: "blue",
    view: "diplomat" as EnterpriseView,
  },
  {
    phase: "Phase 15",
    title: "Hive Mind",
    icon: "🧠",
    features: ["Collective Intelligence", "Cross-Org Learning", "Pattern Synthesis", "Anonymized Knowledge Base"],
    color: "purple",
    view: "hive" as EnterpriseView,
  },
  {
    phase: "Phase 16",
    title: "Autonomous M&A",
    icon: "🤝",
    features: ["Synergy Analysis", "Deal Room", "Merger Execution", "Due Diligence AI"],
    color: "blue",
    view: "ma" as EnterpriseView,
  },
  {
    phase: "Phase 17",
    title: "Legal & Corporate Suite",
    icon: "⚖️",
    features: ["Entity Formation AI", "IP Vault", "Contract Generation", "Regulatory Compliance"],
    color: "amber",
  },
  {
    phase: "Phase 18",
    title: "R&D Tech Scouting",
    icon: "🔬",
    features: ["Emerging Tech Radar", "Auto-Adoption Pipeline", "GitHub Trend Analysis", "Integration Proposals"],
    color: "green",
    view: "rd" as EnterpriseView,
  },
];

const COLOR_MAP: Record<string, { badge: string; border: string; icon: string }> = {
  blue: { badge: "bg-blue-500/10 text-blue-400 border-blue-500/20", border: "hover:border-blue-500/30", icon: "bg-blue-500/10" },
  purple: { badge: "bg-purple-500/10 text-purple-400 border-purple-500/20", border: "hover:border-purple-500/30", icon: "bg-purple-500/10" },
  green: { badge: "bg-green-500/10 text-green-400 border-green-500/20", border: "hover:border-green-500/30", icon: "bg-green-500/10" },
  amber: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", border: "hover:border-amber-500/30", icon: "bg-amber-500/10" },
  red: { badge: "bg-red-500/10 text-red-400 border-red-500/20", border: "hover:border-red-500/30", icon: "bg-red-500/10" },
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("projects");
  const [enterpriseView, setEnterpriseView] = useState<EnterpriseView>("overview");
  const [testResults, setTestResults] = useState<Record<string, { status: number; response: unknown; time: number }>>({});
  const [newProjectPrompt, setNewProjectPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: "", category: "other" as const });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projectsRes, healthRes, envRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/health"),
        fetch("/api/env-check").catch(() => null),
      ]);

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setHealth(data);
      }

      if (envRes?.ok) {
        const data = await envRes.json();
        setEnvVars(data.env || {});
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects(projects.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const createProject = async () => {
    if (!newProjectPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: newProjectPrompt, multiFile: true }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result?.files) {
          const saveRes = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              files: data.result.files,
              description: data.result.description || newProjectPrompt,
              schema: data.result.schema,
              integrations: data.result.integrations,
            }),
          });

          if (saveRes.ok) {
            await fetchData();
            setNewProjectPrompt("");
          }
        }
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const deployProject = async (projectId: string) => {
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json();
        alert("Deployment failed: " + (error.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to deploy:", error);
    }
  };

  const exportToGitHub = async (projectId: string, repoName: string) => {
    try {
      const res = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, repoName }),
      });

      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json();
        alert("GitHub export failed: " + (error.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to export:", error);
    }
  };

  const testEndpoint = async (endpoint: EndpointTest) => {
    const startTime = performance.now();
    try {
      const options: RequestInit = {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      };

      if (endpoint.method === "POST") {
        let body: Record<string, unknown> = {};
        if (endpoint.endpoint === "/api/generate") body = { prompt: "Test component", stream: false };
        if (endpoint.endpoint === "/api/generate-advanced") body = { prompt: "Test app" };
        if (endpoint.endpoint === "/api/deploy") body = { projectId: "00000000-0000-0000-0000-000000000000" };
        if (endpoint.endpoint === "/api/github") body = { projectId: "00000000-0000-0000-0000-000000000000", repoName: "test-repo" };
        if (endpoint.endpoint === "/api/feedback") body = { projectId: "00000000-0000-0000-0000-000000000000", rating: 5, category: "other" };
        if (endpoint.endpoint === "/api/validate-idea") body = { idea: "Test idea" };
        if (endpoint.endpoint === "/api/build-company") body = { idea: "Test company" };
        if (endpoint.endpoint === "/api/swarm") body = { prompt: "Test prompt" };
        if (endpoint.endpoint === "/api/self-improve") body = {};
        if (endpoint.endpoint === "/api/learning") body = { source: "feedback", type: "pattern", content: "Test", impact: "medium" };
        options.body = JSON.stringify(body);
      }

      const res = await fetch(endpoint.endpoint, options);
      const time = Math.round(performance.now() - startTime);

      let response;
      try {
        response = await res.json();
      } catch {
        response = { statusText: res.statusText };
      }

      setTestResults(prev => ({
        ...prev,
        [endpoint.endpoint]: { status: res.status, response, time }
      }));
    } catch (error) {
      const time = Math.round(performance.now() - startTime);
      setTestResults(prev => ({
        ...prev,
        [endpoint.endpoint]: { status: 0, response: { error: (error as Error).message }, time }
      }));
    }
  };

  const submitFeedback = async () => {
    if (!feedback.comment.trim()) return;
    setFeedbackSubmitting(true);
    setFeedbackMessage("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "dashboard-feedback",
          rating: feedback.rating,
          comment: feedback.comment,
          category: feedback.category,
        }),
      });

      if (res.ok) {
        setFeedbackMessage("Feedback submitted successfully!");
        setFeedback({ rating: 5, comment: "", category: "other" });
      } else {
        setFeedbackMessage("Failed to submit feedback");
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setFeedbackMessage("Error submitting feedback");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "available" || status === "ready" || status === "healthy") return "bg-green-500";
    if (status === "unavailable") return "bg-red-500";
    if (status === "building" || status === "pending") return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app" className="text-brand-400 hover:text-brand-300 font-bold text-sm transition-colors">
              ← Generator
            </Link>
            <h1 className="text-xl font-black tracking-tight text-white">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(health?.status || "unknown")}`} />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{health?.status || "Unknown"}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: "projects", label: "Projects", icon: "📁" },
            { id: "health", label: "System Health", icon: "🏥" },
            { id: "endpoints", label: "API Endpoints", icon: "🔌" },
            { id: "billing", label: "Billing & Payment", icon: "💳" },
            { id: "ai-tools", label: "AI Tools", icon: "🤖" },
            { id: "enterprise", label: "Enterprise (Ph. 8-18)", icon: "🏢" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`rounded-xl px-5 py-2 text-xs font-bold tracking-wide whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                  : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Projects Tab */}
            {activeTab === "projects" && (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-base font-black mb-4 text-white">Create New Project</h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newProjectPrompt}
                      onChange={(e) => setNewProjectPrompt(e.target.value)}
                      placeholder="Describe the app you want to generate..."
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-brand-500/50"
                      disabled={isGenerating}
                    />
                    <button
                      onClick={createProject}
                      disabled={isGenerating || !newProjectPrompt.trim()}
                      className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-black text-white transition-all hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? "Generating…" : "Generate"}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
                  </div>
                  {projects.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      No projects yet. Create one above!
                    </div>
                  ) : (
                    <div className="divide-y">
                      {projects.map(project => (
                        <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {project.description?.split("\n")[0]?.slice(0, 100) || "Untitled Project"}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                ID: {project.id} • Created: {new Date(project.createdAt).toLocaleString()}
                              </p>
                              {project.integrations && project.integrations.length > 0 && (
                                <div className="flex gap-2 mt-2">
                                  {project.integrations.map(int => (
                                    <span key={int} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                      {int}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {project.deployment && (
                                <a
                                  href={project.deployment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200"
                                >
                                  View Live ↗
                                </a>
                              )}
                              <button
                                onClick={() => deployProject(project.id)}
                                disabled={!health?.systems.vercel.status}
                                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 disabled:opacity-50"
                              >
                                Deploy
                              </button>
                              <button
                                onClick={() => {
                                  const repoName = prompt("Enter repository name:");
                                  if (repoName) exportToGitHub(project.id, repoName);
                                }}
                                disabled={!health?.systems.github.status}
                                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50"
                              >
                                Export to GitHub
                              </button>
                              <button
                                onClick={() => deleteProject(project.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {project.deployment && (
                            <div className="mt-3 flex items-center gap-2 text-sm">
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(project.deployment.status)}`} />
                              <span className="text-gray-600">Deployment: {project.deployment.status}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600">{project.deployment.url}</span>
                            </div>
                          )}
                          {project.githubRepo && (
                            <div className="mt-2 text-sm">
                              <a
                                href={project.githubRepo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                GitHub: {project.githubRepo}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Health Tab */}
            {activeTab === "health" && health && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">System Status</h2>
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getStatusColor(health.status)}`} />
                    <span className="text-lg font-medium capitalize">{health.status}</span>
                    <span className="text-gray-500">• Last updated: {new Date(health.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Integration Status</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(health.systems).map(([key, system]) => (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-3 h-3 rounded-full ${getStatusColor(system.status)}`} />
                          <span className="font-medium capitalize">{key}</span>
                        </div>
                        <p className="text-sm text-gray-600">{system.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Phase Status</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(health.phases).map(([phase, status]) => {
                      const info = PHASE_NAMES[phase] || { name: phase, description: "" };
                      return (
                        <div key={phase} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                            <span className="font-medium">{info.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">{info.description}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded capitalize">
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Submit Feedback</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                      <select
                        value={feedback.rating}
                        onChange={(e) => setFeedback({ ...feedback, rating: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {[5, 4, 3, 2, 1].map(r => (
                          <option key={r} value={r}>{r} stars</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={feedback.category}
                        onChange={(e) => setFeedback({ ...feedback, category: e.target.value as typeof feedback.category })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="accuracy">Accuracy</option>
                        <option value="performance">Performance</option>
                        <option value="style">Style</option>
                        <option value="completeness">Completeness</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                      <textarea
                        value={feedback.comment}
                        onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Your feedback..."
                      />
                    </div>
                    <button
                      onClick={submitFeedback}
                      disabled={feedbackSubmitting || !feedback.comment.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                    </button>
                    {feedbackMessage && (
                      <p className={`text-sm ${feedbackMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
                        {feedbackMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* API Endpoints Tab */}
            {activeTab === "endpoints" && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold">API Endpoints</h2>
                  <p className="text-sm text-gray-600 mt-1">Test all available API endpoints</p>
                </div>
                <div className="divide-y">
                  {API_ENDPOINTS.map(endpoint => {
                    const result = testResults[endpoint.endpoint];
                    return (
                      <div key={endpoint.endpoint} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                endpoint.method === "GET" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                              }`}>
                                {endpoint.method}
                              </span>
                              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                {endpoint.endpoint}
                              </code>
                              <span className="font-medium">{endpoint.name}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
                          </div>
                          <button
                            onClick={() => testEndpoint(endpoint)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Test
                          </button>
                        </div>
                        {result && (
                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                result.status >= 200 && result.status < 300
                                  ? "bg-green-100 text-green-700"
                                  : result.status >= 400
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}>
                                {result.status || "Error"}
                              </span>
                              <span className="text-sm text-gray-600">{result.time}ms</span>
                            </div>
                            <pre className="text-xs bg-gray-800 text-gray-100 p-3 rounded overflow-auto max-h-40">
                              {JSON.stringify(result.response, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <div className="space-y-6">
                <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
                  <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Billing & Payment Gateway</h2>
                  <p className="text-muted-foreground text-sm mb-8">
                    Manage your subscription, purchase lifetime licenses, or top up your AI credits.
                  </p>
                  <PricingTable orgId="00000000-0000-0000-0000-000000000000" />
                </div>
              </div>
            )}

            {/* AI Tools Tab */}
            {activeTab === "ai-tools" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">AI Company Builder Tools</h2>
                  <p className="text-gray-600 mb-6">
                    These tools help you validate business ideas, plan products, and build AI-powered companies.
                    Note: Some features require authentication.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { icon: "💡", title: "Idea Validator", desc: "Validate and analyze business ideas with market research", endpoint: "/api/validate-idea", name: "Validate Idea", method: "POST" },
                      { icon: "🏢", title: "Build Company", desc: "Full AI company builder with validation, planning, and growth", endpoint: "/api/build-company", name: "Build Company", method: "POST" },
                      { icon: "🐝", title: "Agent Swarm", desc: "Multi-agent collaboration for complex tasks", endpoint: "/api/swarm", name: "Swarm", method: "POST" },
                      { icon: "📈", title: "Growth Engine", desc: "Generate growth strategies and marketing plans", endpoint: "/api/growth", name: "Growth", method: "POST" },
                      { icon: "💰", title: "Monetization", desc: "Create pricing tiers and revenue models", endpoint: "/api/monetization", name: "Monetization", method: "POST" },
                      { icon: "🔄", title: "Self Improvement", desc: "Trigger AI self-improvement and learning", endpoint: "/api/self-improve", name: "Self Improve", method: "POST" },
                      { icon: "📚", title: "Learning Store", desc: "View and manage AI learning patterns", endpoint: "/api/learning", name: "Learning", method: "GET" },
                      { icon: "🛒", title: "Marketplace", desc: "Browse and purchase templates/modules", endpoint: "/api/marketplace", name: "Marketplace", method: "GET" },
                      { icon: "📢", title: "Hype Agent", desc: "Launch viral growth campaigns", endpoint: "/api/hype", name: "Hype", method: "POST" },
                      { icon: "🛡️", title: "Compliance Vault", desc: "Run automated compliance audits", endpoint: "/api/compliance", name: "Compliance", method: "POST" },
                      { icon: "💼", title: "Diplomat Agent", desc: "Audit and negotiate vendor relations", endpoint: "/api/diplomat", name: "Diplomat", method: "GET" },
                    ].map(tool => (
                      <div key={tool.endpoint} className="border rounded-lg p-4">
                        <h3 className="font-medium mb-2">{tool.icon} {tool.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{tool.desc}</p>
                        <button
                          onClick={() => testEndpoint({ name: tool.name, method: tool.method, endpoint: tool.endpoint, description: "" })}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          Test Endpoint
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Analytics & Metrics</h2>
                  <div className="flex gap-4">
                    <button
                      onClick={() => testEndpoint({ name: "Analytics", method: "GET", endpoint: "/api/analytics", description: "" })}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      View Analytics
                    </button>
                    <button
                      onClick={() => testEndpoint({ name: "Feedback", method: "GET", endpoint: "/api/feedback", description: "" })}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      View Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Enterprise Tab (Phases 8-18) */}
            {activeTab === "enterprise" && (
              <div className="space-y-8">
                {/* Enterprise Sub-navigation */}
                <div className="glass-card rounded-2xl p-4">
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: "overview", label: "Overview", icon: "🗂️" },
                      { id: "economy", label: "Agent Economy", icon: "💹" },
                      { id: "governance", label: "Governance", icon: "🛡️" },
                      { id: "vc", label: "VC Portal", icon: "🚀" },
                      { id: "diplomat", label: "Diplomat", icon: "💼" },
                      { id: "hive", label: "Hive Mind", icon: "🧠" },
                      { id: "ma", label: "M&A Room", icon: "🤝" },
                      { id: "rd", label: "R&D Lab", icon: "🔬" },
                    ] as { id: EnterpriseView; label: string; icon: string }[]).map(view => (
                      <button
                        key={view.id}
                        onClick={() => setEnterpriseView(view.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold tracking-wide whitespace-nowrap transition-all ${
                          enterpriseView === view.id
                            ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                            : "border border-white/10 bg-white/5 text-muted-foreground hover:text-white"
                        }`}
                      >
                        {view.icon} {view.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overview */}
                {enterpriseView === "overview" && (
                  <div className="space-y-6">
                    <div className="text-center mb-8">
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">Enterprise Suite</h2>
                      <p className="text-muted-foreground text-sm">Phases 8–18: The autonomous AI empire toolkit</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {ENTERPRISE_FEATURES.map(feature => {
                        const colors = COLOR_MAP[feature.color];
                        return (
                          <div
                            key={feature.phase}
                            className={`p-6 rounded-3xl border border-white/10 bg-white/5 transition-all group ${colors.border}`}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-12 h-12 rounded-2xl ${colors.icon} flex items-center justify-center text-2xl`}>
                                {feature.icon}
                              </div>
                              <div>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${colors.badge}`}>
                                  {feature.phase}
                                </span>
                                <h3 className="text-base font-black text-white uppercase tracking-tight mt-1">{feature.title}</h3>
                              </div>
                            </div>

                            <ul className="space-y-2 mb-5">
                              {feature.features.map(f => (
                                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>

                            {feature.view ? (
                              <button
                                onClick={() => setEnterpriseView(feature.view!)}
                                className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                              >
                                Open Dashboard →
                              </button>
                            ) : (
                              <div className="w-full py-2.5 rounded-xl border border-white/5 bg-white/3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                                Elite Plan Required
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Agent Economy (Phase 10) */}
                {enterpriseView === "economy" && (
                  <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                      <span className="text-2xl">💹</span>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">Agent Economy</h2>
                        <p className="text-xs text-muted-foreground">Phase 10 — Credit system & skills marketplace</p>
                      </div>
                    </div>
                    <EconomyDashboard orgId="00000000-0000-0000-0000-000000000000" />
                  </div>
                )}

                {/* Governance (Phase 12) */}
                {enterpriseView === "governance" && (
                  <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                      <span className="text-2xl">🛡️</span>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">Governance Gates</h2>
                        <p className="text-xs text-muted-foreground">Phase 12 — Human-in-the-loop approvals & risk management</p>
                      </div>
                    </div>
                    <ApprovalsTab />
                  </div>
                )}

                {/* VC Portal (Phase 13) */}
                {enterpriseView === "vc" && (
                  <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                      <span className="text-2xl">🚀</span>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">Autonomous VC</h2>
                        <p className="text-xs text-muted-foreground">Phase 13 — AI investment engine & portfolio management</p>
                      </div>
                    </div>
                    <InvestorPortal />
                  </div>
                )}

                {/* Diplomat (Phase 14) */}
                {enterpriseView === "diplomat" && (
                  <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                      <span className="text-2xl">💼</span>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">Agentic Diplomacy</h2>
                        <p className="text-xs text-muted-foreground">Phase 14 — Autonomous vendor negotiation & cost optimization</p>
                      </div>
                    </div>
                    <DiplomatDashboard />
                  </div>
                )}

                {/* Hive Mind (Phase 15) */}
                {enterpriseView === "hive" && (
                  <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                      <span className="text-2xl">🧠</span>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">Hive Mind</h2>
                        <p className="text-xs text-muted-foreground">Phase 15 — Collective intelligence & cross-org learning</p>
                      </div>
                    </div>
                    <HiveDashboard />
                  </div>
                )}

                {/* M&A Room (Phase 16) */}
                {enterpriseView === "ma" && (
                  <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                      <span className="text-2xl">🤝</span>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">M&A Deal Room</h2>
                        <p className="text-xs text-muted-foreground">Phase 16 — Autonomous project consolidation & strategic mergers</p>
                      </div>
                    </div>
                    <MADealRoom />
                  </div>
                )}

                {/* R&D Lab (Phase 18) */}
                {enterpriseView === "rd" && (
                  <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex items-center gap-3">
                      <span className="text-2xl">🔬</span>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">R&D Tech Scouting</h2>
                        <p className="text-xs text-muted-foreground">Phase 18 — Emerging tech radar & automated adoption pipeline</p>
                      </div>
                    </div>
                    <RDLab />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
