"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"projects" | "health" | "endpoints" | "env" | "ai-tools">("projects");
  const [testResults, setTestResults] = useState<Record<string, { status: number; response: unknown; time: number }>>({});
  const [newProjectPrompt, setNewProjectPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comment: "", category: "other" as const });
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Fetch data
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

  // Delete project
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

  // Create new project
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
          // Save the project
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

  // Deploy project
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

  // Export to GitHub
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

  // Test endpoint
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

  // Submit feedback
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
            { id: "ai-tools", label: "AI Tools", icon: "🏢" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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
                {/* Create Project */}
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

                {/* Projects List */}
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
                {/* Overall Status */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">System Status</h2>
                  <div className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded-full ${getStatusColor(health.status)}`} />
                    <span className="text-lg font-medium capitalize">{health.status}</span>
                    <span className="text-gray-500">• Last updated: {new Date(health.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {/* Integrations */}
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

                {/* Phase Status */}
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

                {/* Feedback Section */}
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

            {/* AI Company Builder Tab */}
            {activeTab === "ai-tools" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">AI Company Builder Tools</h2>
                  <p className="text-gray-600 mb-6">
                    These tools help you validate business ideas, plan products, and build AI-powered companies.
                    Note: Some features require authentication.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Idea Validator */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">💡 Idea Validator</h3>
                      <p className="text-sm text-gray-600 mb-3">Validate and analyze business ideas with market research</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Validate Idea",
                          method: "POST",
                          endpoint: "/api/validate-idea",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Build Company */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">🏢 Build Company</h3>
                      <p className="text-sm text-gray-600 mb-3">Full AI company builder with validation, planning, and growth</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Build Company",
                          method: "POST",
                          endpoint: "/api/build-company",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Swarm */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">🐝 Agent Swarm</h3>
                      <p className="text-sm text-gray-600 mb-3">Multi-agent collaboration for complex tasks</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Swarm",
                          method: "POST",
                          endpoint: "/api/swarm",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Growth Engine */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">📈 Growth Engine</h3>
                      <p className="text-sm text-gray-600 mb-3">Generate growth strategies and marketing plans</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Growth",
                          method: "POST",
                          endpoint: "/api/growth",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Monetization */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">💰 Monetization</h3>
                      <p className="text-sm text-gray-600 mb-3">Create pricing tiers and revenue models</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Monetization",
                          method: "POST",
                          endpoint: "/api/monetization",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Self Improve */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">🔄 Self Improvement</h3>
                      <p className="text-sm text-gray-600 mb-3">Trigger AI self-improvement and learning</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Self Improve",
                          method: "POST",
                          endpoint: "/api/self-improve",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Learning Store */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">📚 Learning Store</h3>
                      <p className="text-sm text-gray-600 mb-3">View and manage AI learning patterns</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Learning",
                          method: "GET",
                          endpoint: "/api/learning",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Marketplace */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">🛒 Marketplace</h3>
                      <p className="text-sm text-gray-600 mb-3">Browse and purchase templates/modules</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Marketplace",
                          method: "GET",
                          endpoint: "/api/marketplace",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Hype Agent */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">📢 Hype Agent</h3>
                      <p className="text-sm text-gray-600 mb-3">Launch viral growth campaigns</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Hype",
                          method: "POST",
                          endpoint: "/api/hype",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Compliance */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">🛡️ Compliance Vault</h3>
                      <p className="text-sm text-gray-600 mb-3">Run automated compliance audits</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Compliance",
                          method: "POST",
                          endpoint: "/api/compliance",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>

                    {/* Diplomat */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">💼 Diplomat Agent</h3>
                      <p className="text-sm text-gray-600 mb-3">Audit and negotiate vendor relations</p>
                      <button
                        onClick={() => testEndpoint({
                          name: "Diplomat",
                          method: "GET",
                          endpoint: "/api/diplomat",
                          description: ""
                        })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        Test Endpoint
                      </button>
                    </div>
                  </div>
                </div>

                {/* Analytics Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Analytics & Metrics</h2>
                  <div className="flex gap-4">
                    <button
                      onClick={() => testEndpoint({
                        name: "Analytics",
                        method: "GET",
                        endpoint: "/api/analytics",
                        description: ""
                      })}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      View Analytics
                    </button>
                    <button
                      onClick={() => testEndpoint({
                        name: "Feedback",
                        method: "GET",
                        endpoint: "/api/feedback",
                        description: ""
                      })}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      View Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
