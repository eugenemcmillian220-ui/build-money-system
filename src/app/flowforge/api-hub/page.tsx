"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Code,
  Zap,
  Lock,
  Copy,
} from "lucide-react";

const API_ENDPOINTS = [
  {
    method: "POST",
    path: "/api/flowforge/workflows",
    description: "Create or update a workflow",
    phase: "Phase 1-3",
    mode: "All",
  },
  {
    method: "POST",
    path: "/api/flowforge/execute",
    description: "Execute a workflow with input data",
    phase: "Phase 5-7",
    mode: "All",
  },
  {
    method: "GET",
    path: "/api/flowforge/analytics",
    description: "Get workflow analytics and metrics",
    phase: "Phase 23-25",
    mode: "Universal+",
  },
  {
    method: "POST",
    path: "/api/flowforge/nano-trigger",
    description: "Trigger a workflow from Nano mobile TMA",
    phase: "Phase 13",
    mode: "Nano",
  },
  {
    method: "POST",
    path: "/api/flowforge/governance",
    description: "Create or vote on governance proposals",
    phase: "Phase 12, 19",
    mode: "Elite",
  },
  {
    method: "GET",
    path: "/api/flowforge/audit",
    description: "Query immutable audit logs",
    phase: "Phase 4, 12",
    mode: "Elite",
  },
  {
    method: "POST",
    path: "/api/flowforge/billing",
    description: "Manage subscription and credit billing",
    phase: "Phase 6, 10",
    mode: "Universal+",
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-500/20 text-green-400",
  POST: "bg-blue-500/20 text-blue-400",
  PUT: "bg-amber-500/20 text-amber-400",
  DELETE: "bg-red-500/20 text-red-400",
};

export default function ApiHubPage() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="api-hub">
      <header className="border-b border-gray-800 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link href="/flowforge/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <Globe className="text-blue-500" size={20} />
          <span className="font-bold">API Hub</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-xs font-bold text-blue-400">REST</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">FlowForge API Reference</h1>
          <p className="text-gray-400">
            Integrate FlowForge workflows into your applications. All endpoints require authentication via Bearer token.
          </p>
        </div>

        {/* Auth Section */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 mb-8">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Lock size={16} className="text-amber-500" /> Authentication
          </h2>
          <p className="text-sm text-gray-400 mb-3">
            Include your API key in the Authorization header for all requests.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-800 font-mono text-sm">
            <Code size={14} className="text-gray-500" />
            <span className="text-green-400">Authorization:</span>
            <span className="text-gray-300">Bearer {"<your-api-key>"}</span>
            <button
              onClick={() => copyToClipboard('Authorization: Bearer <your-api-key>')}
              className="ml-auto text-gray-500 hover:text-white"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Endpoints */}
        <h2 className="text-lg font-bold mb-4">Endpoints</h2>
        <div className="space-y-4">
          {API_ENDPOINTS.map((endpoint) => (
            <div key={`${endpoint.method}-${endpoint.path}`} className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${METHOD_COLORS[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-amber-400">{endpoint.path}</code>
                <button
                  onClick={() => copyToClipboard(endpoint.path)}
                  className="text-gray-600 hover:text-white"
                >
                  <Copy size={12} />
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-2">{endpoint.description}</p>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Zap size={10} className="text-amber-500" /> {endpoint.phase}
                </span>
                <span>Mode: {endpoint.mode}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Example */}
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Code size={16} className="text-amber-500" /> Quick Example
          </h2>
          <pre className="p-4 rounded-lg bg-gray-800 text-sm font-mono overflow-x-auto">
            <code>{`curl -X POST https://your-domain.com/api/flowforge/execute \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your-api-key>" \\
  -d '{
    "workflow_id": "wf-123",
    "input": {
      "lead_email": "contact@example.com",
      "lead_score": 85
    }
  }'`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
