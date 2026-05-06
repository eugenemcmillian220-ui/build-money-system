"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Gavel,
  Users,
  ScrollText,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Download,
  Crown,
  FileText,
} from "lucide-react";
import type { GovernanceProposal, AuditLogEntry } from "@/lib/flowforge/types";

const SAMPLE_PROPOSALS: GovernanceProposal[] = [
  {
    id: "prop-1",
    org_id: "org-1",
    title: "Increase default workflow execution timeout to 120s",
    description: "Current 60s timeout is insufficient for complex ETL pipelines. Proposal to increase the default timeout to 120s for Elite tier workflows.",
    proposed_by: "user-admin",
    status: "active",
    votes_for: 12,
    votes_against: 3,
    quorum_required: 10,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-2",
    org_id: "org-1",
    title: "Enable cross-org workflow sharing via Hive Mind",
    description: "Allow organizations to publish anonymized workflow patterns to the Hive Mind collective intelligence network for mutual benefit.",
    proposed_by: "user-editor",
    status: "passed",
    votes_for: 18,
    votes_against: 2,
    quorum_required: 10,
    expires_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

const SAMPLE_AUDIT: AuditLogEntry[] = [
  {
    id: "audit-1",
    org_id: "org-1",
    user_id: "user-admin",
    action: "workflow.created",
    resource_type: "workflow",
    resource_id: "wf-001",
    details: { name: "Lead Scoring Pipeline", mode: "elite" },
    ip_address: "192.168.1.1",
    created_at: new Date().toISOString(),
  },
  {
    id: "audit-2",
    org_id: "org-1",
    user_id: "user-admin",
    action: "workflow.executed",
    resource_type: "workflow",
    resource_id: "wf-001",
    details: { status: "completed", duration_ms: 2340 },
    ip_address: "192.168.1.1",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "audit-3",
    org_id: "org-1",
    user_id: "user-editor",
    action: "member.invited",
    resource_type: "organization",
    resource_id: "org-1",
    details: { email: "new@example.com", role: "editor" },
    ip_address: "10.0.0.1",
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "audit-4",
    org_id: "org-1",
    user_id: "user-admin",
    action: "governance.vote",
    resource_type: "proposal",
    resource_id: "prop-1",
    details: { vote: "for" },
    ip_address: "192.168.1.1",
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
];

type Tab = "proposals" | "audit" | "members";

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("proposals");
  const [proposals] = useState<GovernanceProposal[]>(SAMPLE_PROPOSALS);
  const [auditLogs] = useState<AuditLogEntry[]>(SAMPLE_AUDIT);

  const handleExportAudit = () => {
    const csv = [
      "id,timestamp,user,action,resource_type,resource_id,ip,details",
      ...auditLogs.map(
        (e) =>
          `${e.id},${e.created_at},${e.user_id},${e.action},${e.resource_type},${e.resource_id},${e.ip_address},"${JSON.stringify(e.details)}"`,
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowforge-audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="governance-page">
      <header className="border-b border-gray-800 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/flowforge/dashboard" className="text-gray-400 hover:text-white">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <Crown className="text-amber-500" size={20} />
              <span className="font-bold">Governance Hub</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-xs font-bold text-amber-400">ELITE</span>
            </div>
          </div>
          <div className="flex gap-1">
            {(["proposals", "audit", "members"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  activeTab === tab ? "bg-amber-500/10 text-amber-400" : "text-gray-400 hover:text-white"
                }`}
                data-testid={`gov-tab-${tab}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Proposals */}
        {activeTab === "proposals" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Gavel size={20} className="text-amber-500" /> Active Proposals
              </h2>
              <button className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">
                <FileText size={14} /> New Proposal
              </button>
            </div>
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{proposal.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{proposal.description}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        proposal.status === "active"
                          ? "bg-blue-500/20 text-blue-400"
                          : proposal.status === "passed"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {proposal.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp size={14} className="text-green-400" />
                      <span className="text-sm">{proposal.votes_for}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDown size={14} className="text-red-400" />
                      <span className="text-sm">{proposal.votes_against}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>Quorum: {proposal.quorum_required}</span>
                    </div>
                    {proposal.status === "active" && (
                      <div className="flex gap-2 ml-auto">
                        <button className="flex items-center gap-1 rounded-md bg-green-600/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-600/30">
                          <ThumbsUp size={12} /> Vote For
                        </button>
                        <button className="flex items-center gap-1 rounded-md bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30">
                          <ThumbsDown size={12} /> Vote Against
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Logs */}
        {activeTab === "audit" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ScrollText size={20} className="text-amber-500" /> Audit Log
              </h2>
              <button
                onClick={handleExportAudit}
                className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <div className="rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900">
                  <tr className="text-gray-400 text-xs uppercase">
                    <th className="text-left p-3">Timestamp</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Resource</th>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3 text-xs text-gray-400 font-mono">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-xs font-mono">{entry.action}</span>
                      </td>
                      <td className="p-3 text-xs text-gray-400">{entry.resource_type}/{entry.resource_id}</td>
                      <td className="p-3 text-xs text-gray-400">{entry.user_id}</td>
                      <td className="p-3 text-xs text-gray-500 font-mono">{entry.ip_address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Members */}
        {activeTab === "members" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users size={20} className="text-amber-500" /> Organization Members
              </h2>
              <button className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400">
                <Users size={14} /> Invite Member
              </button>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
              <div className="space-y-3">
                {[
                  { email: "admin@flowforge.ai", role: "Owner", status: "active" },
                  { email: "editor@flowforge.ai", role: "Editor", status: "active" },
                  { email: "viewer@flowforge.ai", role: "Viewer", status: "active" },
                  { email: "new@example.com", role: "Editor", status: "pending" },
                ].map((member) => (
                  <div key={member.email} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-amber-400">
                          {member.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.email}</p>
                        <p className="text-xs text-gray-500">{member.status === "pending" ? "Invite pending" : "Active"}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      member.role === "Owner" ? "bg-amber-500/20 text-amber-400" :
                      member.role === "Admin" ? "bg-purple-500/20 text-purple-400" :
                      member.role === "Editor" ? "bg-blue-500/20 text-blue-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
