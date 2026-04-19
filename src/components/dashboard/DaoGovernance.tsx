// DA-012 FIX: orgId resolved server-side from auth session, not client request
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Gavel,
  TrendingUp,
  ShieldCheck,
  Users,
  Plus,
  ChevronRight,
  Vote,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Trophy,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  proposed_by: string | null;
  proposal_type: string | null;
  status: string;
  votes_for: number;
  votes_against: number;
  quorum_required: number;
  execution_payload: Record<string, unknown> | null;
  created_at: string;
  expires_at: string | null;
  executed_at: string | null;
}

interface DaoStats {
  totalProposals: number;
  openProposals: number;
  approvedProposals: number;
  totalVotes: number;
  totalAGTDistributed: number;
  totalUGTDistributed: number;
}

type TabType = "active" | "approved" | "all";

export default function DaoGovernance() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [balances, setBalances] = useState({ AGT: 0, UGT: 0 });
  const [stats, setStats] = useState<DaoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<string>("governance");
  const [newQuorum, setNewQuorum] = useState(10);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const statusFilter = activeTab === "active" ? "open" : activeTab === "approved" ? "approved" : undefined;

      const [proposalsRes, balancesRes, statsRes] = await Promise.all([
        fetch(`/api/dao?action=proposals${statusFilter ? `&status=${statusFilter}` : ""}&limit=50`),
        fetch("/api/dao?action=balances"),
        fetch("/api/dao?action=stats"),
      ]);

      if (proposalsRes.ok) {
        const data = await proposalsRes.json();
        setProposals(data.proposals || []);
      }
      if (balancesRes.ok) {
        const data = await balancesRes.json();
        setBalances(data.balances || { AGT: 0, UGT: 0 });
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || null);
      }
      setError(null);
    } catch (err) {
      setError("Failed to load DAO data");
      console.error("[DAO UI]", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (proposalId: string, vote: "for" | "against") => {
    try {
      setVoting(proposalId);
      const res = await fetch("/api/dao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", proposalId, vote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Vote failed");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(null);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/dao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_proposal",
          title: newTitle,
          description: newDescription,
          type: newType,
          quorumRequired: newQuorum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create proposal");
      setShowCreateForm(false);
      setNewTitle("");
      setNewDescription("");
      setNewType("governance");
      setNewQuorum(10);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (proposalId: string) => {
    try {
      setVoting(proposalId);
      const res = await fetch("/api/dao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute", proposalId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Execution failed");
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Token Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sovereign DAO</h1>
          <p className="text-muted-foreground">
            Autonomous governance and profit distribution for the swarm.
          </p>
        </div>

        <div className="flex gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Agent Tokens (AGT)</p>
                <p className="text-xl font-bold">{balances.AGT.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">User Tokens (UGT)</p>
                <p className="text-xl font-bold">{balances.UGT.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Governance View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Proposals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Bar + New Proposal */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {(["active", "approved", "all"] as TabType[]).map((tab) => (
                <Button
                  key={tab}
                  size="sm"
                  variant={activeTab === tab ? "default" : "outline"}
                  onClick={() => setActiveTab(tab)}
                  className="capitalize"
                >
                  {tab === "active" ? "Open" : tab}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              <Plus className="w-4 h-4" /> New Proposal
            </Button>
          </div>

          {/* Create Proposal Form */}
          {showCreateForm && (
            <Card className="border-primary/30">
              <CardContent className="p-6">
                <form onSubmit={handleCreateProposal} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                      placeholder="Proposal title..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full mt-1 p-2 bg-background border rounded-md text-sm h-24 resize-none"
                      placeholder="Describe the proposal..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                      >
                        <option value="governance">Governance</option>
                        <option value="investment">Investment</option>
                        <option value="tech_adoption">Tech Adoption</option>
                        <option value="treasury">Treasury</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Quorum Required</label>
                      <input
                        type="number"
                        value={newQuorum}
                        onChange={(e) => setNewQuorum(parseInt(e.target.value))}
                        className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                        min={1}
                        max={1000}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Proposal
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Proposals List */}
          <div className="space-y-4">
            {loading && proposals.length === 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading proposals...</p>
                </CardContent>
              </Card>
            ) : proposals.length === 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-12 text-center">
                  <Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">No {activeTab === "all" ? "" : activeTab} proposals</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "active"
                      ? "The swarm is currently operating under standard protocol."
                      : "No proposals match this filter."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={handleVote}
                  onExecute={handleExecute}
                  isVoting={voting === proposal.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Treasury & Analytics */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Swarm Treasury
          </h2>

          {/* DAO Stats */}
          {stats && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>DAO Activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="flex items-center gap-2">
                    <Gavel className="w-3.5 h-3.5" /> Total Proposals
                  </span>
                  <Badge variant="secondary">{stats.totalProposals}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Open Now
                  </span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                    {stats.openProposals}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                    {stats.approvedProposals}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                  <span className="flex items-center gap-2">
                    <Vote className="w-3.5 h-3.5" /> Total Votes
                  </span>
                  <Badge variant="secondary">{stats.totalVotes}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Token Distribution */}
          {stats && (
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Token Distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-primary/5 text-sm">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" /> AGT Distributed
                  </span>
                  <span className="font-bold">{stats.totalAGTDistributed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-secondary/5 text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> UGT Distributed
                  </span>
                  <span className="font-bold">{stats.totalUGTDistributed.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">DAO Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">
                  {stats ? Math.min(100, 50 + stats.totalVotes * 2 + stats.approvedProposals * 5) : 0}/100
                </div>
                <Badge className="bg-green-500">
                  {stats && stats.totalVotes > 10 ? "OPTIMAL" : stats && stats.totalVotes > 0 ? "GROWING" : "NEW"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Health score based on voter participation and governance activity.
              </p>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="w-4 h-4" /> Token Rewards
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong>AGT (Agent Tokens):</strong> Earned by creating proposals (+5 AGT) and through revenue generation.
              </p>
              <p>
                <strong>UGT (User Tokens):</strong> Earned by voting (+1 UGT per vote) and via subscriptions.
              </p>
              <p>Proposals auto-execute when quorum is reached.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  onVote,
  onExecute,
  isVoting,
}: {
  proposal: Proposal;
  onVote: (id: string, vote: "for" | "against") => void;
  onExecute: (id: string) => void;
  isVoting: boolean;
}) {
  const totalVotes = proposal.votes_for + proposal.votes_against;
  const progress = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 50;
  const quorumProgress = Math.min(100, (totalVotes / proposal.quorum_required) * 100);
  const isOpen = proposal.status === "open";
  const isApproved = proposal.status === "approved";
  const isExpired = proposal.expires_at && new Date(proposal.expires_at) < new Date();

  const statusColor: Record<string, string> = {
    open: "bg-blue-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    executed: "bg-purple-500",
    expired: "bg-gray-500",
  };

  const typeIcon: Record<string, string> = {
    governance: "🏛️",
    investment: "💰",
    tech_adoption: "🔧",
    treasury: "🏦",
  };

  return (
    <Card className="hover:border-primary/50 transition-colors group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <Badge variant="outline" className="mb-2 uppercase tracking-widest text-[10px]">
              {typeIcon[proposal.proposal_type || "governance"] || "📋"} {proposal.proposal_type}
            </Badge>
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
              {proposal.title}
            </h3>
          </div>
          <Badge className={statusColor[proposal.status] || "bg-gray-500"}>
            {proposal.status}
          </Badge>
        </div>

        {proposal.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{proposal.description}</p>
        )}

        {/* Vote Progress */}
        <div className="space-y-3">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-green-500 uppercase tracking-tighter">FOR: {proposal.votes_for}</span>
            <span className="text-red-500 uppercase tracking-tighter">AGAINST: {proposal.votes_against}</span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-red-500/20 [&>div]:bg-green-500"
          />

          {/* Quorum Progress */}
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Quorum: {totalVotes}/{proposal.quorum_required} votes</span>
            <span>{Math.round(quorumProgress)}%</span>
          </div>
          <Progress value={quorumProgress} className="h-1" />

          {/* Expiry */}
          {proposal.expires_at && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {isExpired ? (
                <span className="text-red-400">Expired</span>
              ) : (
                <span>
                  Expires {new Date(proposal.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isOpen && !isExpired && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 border-green-500/30 text-green-500 hover:bg-green-500/10"
              onClick={() => onVote(proposal.id, "for")}
              disabled={isVoting}
            >
              {isVoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Vote For
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
              onClick={() => onVote(proposal.id, "against")}
              disabled={isVoting}
            >
              {isVoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              Vote Against
            </Button>
          </div>
        )}

        {isApproved && (
          <div className="mt-4 pt-4 border-t">
            <Button
              size="sm"
              className="w-full gap-2 bg-purple-500 hover:bg-purple-600"
              onClick={() => onExecute(proposal.id)}
              disabled={isVoting}
            >
              {isVoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Execute Proposal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
