"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe2,
  Network,
  ArrowRightLeft,
  Brain,
  Shield,
  TrendingUp,
  Zap,
  Users,
  Plus,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Eye,
  Send,
  Handshake,
  Radio,
  Cpu,
  BookOpen,
  FileCode2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Empire {
  id: string;
  empire_name: string;
  empire_url: string | null;
  description: string | null;
  capabilities: string[];
  agents_available: string[];
  trust_score: number;
  total_trades: number;
  total_intelligence_shared: number;
  is_active: boolean;
  registered_at: string;
  last_heartbeat_at: string;
}

interface Trade {
  id: string;
  seller_empire_id: string | null;
  buyer_empire_id: string | null;
  trade_type: string;
  resource_name: string;
  resource_description: string | null;
  price_agt: number;
  price_ugt: number;
  status: string;
  rating: number | null;
  created_at: string;
}

interface Intelligence {
  id: string;
  source_empire_id: string | null;
  intel_type: string;
  title: string;
  summary: string;
  confidence: number;
  relevance_score: number;
  is_verified: boolean;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

interface Stats {
  total_empires: number;
  total_connections: number;
  total_trades: number;
  active_trades: number;
  completed_trades: number;
  intelligence_shared: number;
  avg_trust_score: number;
}

type TabType = "empires" | "trades" | "intelligence";

const tradeTypeIcons: Record<string, typeof Cpu> = {
  agent_lending: Users,
  knowledge: BookOpen,
  compute: Cpu,
  template: FileCode2,
};

const intelTypeColors: Record<string, string> = {
  trend: "bg-blue-500",
  security: "bg-red-500",
  performance: "bg-green-500",
  market: "bg-purple-500",
  threat: "bg-orange-500",
};

export default function SwarmMesh() {
  const [empires, setEmpires] = useState<Empire[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [intelligence, setIntelligence] = useState<Intelligence[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("empires");
  const [error, setError] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showShareIntel, setShowShareIntel] = useState(false);

  // Registration form
  const [regName, setRegName] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [regUrl, setRegUrl] = useState("");
  const [regCapabilities, setRegCapabilities] = useState("");

  // Intelligence form
  const [intelTitle, setIntelTitle] = useState("");
  const [intelSummary, setIntelSummary] = useState("");
  const [intelType, setIntelType] = useState("trend");
  const [intelConfidence, setIntelConfidence] = useState(0.7);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const requests: Promise<Response>[] = [
        fetch("/api/federation?action=stats"),
      ];

      if (activeTab === "empires") requests.push(fetch("/api/federation?action=empires&limit=50"));
      if (activeTab === "trades") requests.push(fetch("/api/federation?action=trades&limit=50"));
      if (activeTab === "intelligence") requests.push(fetch("/api/federation?action=intelligence&limit=50"));

      const responses = await Promise.all(requests);
      const statsData = await responses[0].json();
      if (statsData.stats) setStats(statsData.stats);

      if (responses[1]) {
        const tabData = await responses[1].json();
        if (activeTab === "empires") setEmpires(tabData.empires || []);
        if (activeTab === "trades") setTrades(tabData.trades || []);
        if (activeTab === "intelligence") setIntelligence(tabData.intelligence || []);
      }

      setError(null);
    } catch (err) {
      setError("Failed to load federation data");
      console.error("[MESH UI]", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/federation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          empireName: regName,
          description: regDesc || undefined,
          empireUrl: regUrl || undefined,
          capabilities: regCapabilities ? regCapabilities.split(",").map((s) => s.trim()) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowRegister(false);
      setRegName("");
      setRegDesc("");
      setRegUrl("");
      setRegCapabilities("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleShareIntel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // For now, we need an empire ID — use the first one or prompt
      const res = await fetch("/api/federation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "share_intelligence",
          sourceEmpireId: empires[0]?.id, // Use registered empire
          intelType: intelType,
          title: intelTitle,
          summary: intelSummary,
          confidence: intelConfidence,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowShareIntel(false);
      setIntelTitle("");
      setIntelSummary("");
      setIntelType("trend");
      setActiveTab("intelligence");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share intelligence");
    } finally {
      setLoading(false);
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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl">
              <Globe2 className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Swarm Mesh</h1>
          </div>
          <p className="text-muted-foreground">
            Phase 22 — Autonomous Multi-Empire Federation Network
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowRegister(!showRegister)}>
            <Plus className="w-4 h-4" /> Register Empire
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowShareIntel(!showShareIntel)}>
            <Brain className="w-4 h-4" /> Share Intel
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Empires", value: stats.total_empires, icon: Globe2, color: "text-cyan-400" },
            { label: "Connections", value: stats.total_connections, icon: Link2, color: "text-blue-400" },
            { label: "Total Trades", value: stats.total_trades, icon: ArrowRightLeft, color: "text-purple-400" },
            { label: "Active Trades", value: stats.active_trades, icon: Zap, color: "text-yellow-400" },
            { label: "Completed", value: stats.completed_trades, icon: CheckCircle2, color: "text-green-400" },
            { label: "Intel Shared", value: stats.intelligence_shared, icon: Brain, color: "text-pink-400" },
            { label: "Avg Trust", value: `${Math.round(stats.avg_trust_score)}%`, icon: Shield, color: "text-emerald-400" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-muted/30">
              <CardContent className="p-3 flex items-center gap-2">
                <stat.icon className={`w-4 h-4 ${stat.color} shrink-0`} />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Registration Form */}
      {showRegister && (
        <Card className="border-cyan-500/30">
          <CardContent className="p-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" /> Register Your Empire
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Empire Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                    placeholder="Sovereign Forge Empire"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Empire URL</label>
                  <input
                    type="url"
                    value={regUrl}
                    onChange={(e) => setRegUrl(e.target.value)}
                    className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                    placeholder="https://your-empire.vercel.app"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={regDesc}
                  onChange={(e) => setRegDesc(e.target.value)}
                  className="w-full mt-1 p-2 bg-background border rounded-md text-sm h-20 resize-none"
                  placeholder="What does your empire specialize in?"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Capabilities (comma-separated)</label>
                <input
                  type="text"
                  value={regCapabilities}
                  onChange={(e) => setRegCapabilities(e.target.value)}
                  className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                  placeholder="security, ai-generation, legal, marketing"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowRegister(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Register Empire
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Share Intel Form */}
      {showShareIntel && (
        <Card className="border-pink-500/30">
          <CardContent className="p-6">
            <form onSubmit={handleShareIntel} className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-pink-400" /> Share Intelligence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    value={intelTitle}
                    onChange={(e) => setIntelTitle(e.target.value)}
                    className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                    placeholder="Intelligence report title..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={intelType}
                      onChange={(e) => setIntelType(e.target.value)}
                      className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                    >
                      <option value="trend">Trend</option>
                      <option value="security">Security</option>
                      <option value="performance">Performance</option>
                      <option value="market">Market</option>
                      <option value="threat">Threat</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confidence</label>
                    <input
                      type="number"
                      value={intelConfidence}
                      onChange={(e) => setIntelConfidence(parseFloat(e.target.value))}
                      className="w-full mt-1 p-2 bg-background border rounded-md text-sm"
                      min={0}
                      max={1}
                      step={0.1}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Summary</label>
                <textarea
                  value={intelSummary}
                  onChange={(e) => setIntelSummary(e.target.value)}
                  className="w-full mt-1 p-2 bg-background border rounded-md text-sm h-24 resize-none"
                  placeholder="Detailed intelligence summary..."
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowShareIntel(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-pink-600 hover:bg-pink-700">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Share Intel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2">
        {(
          [
            { key: "empires", label: "Federation Empires", icon: Globe2 },
            { key: "trades", label: "Resource Trades", icon: ArrowRightLeft },
            { key: "intelligence", label: "Intel Feed", icon: Brain },
          ] as { key: TabType; label: string; icon: typeof Globe2 }[]
        ).map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
            className="gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {loading && empires.length === 0 && trades.length === 0 && intelligence.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-muted-foreground mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground">Scanning the mesh network...</p>
            </CardContent>
          </Card>
        ) : activeTab === "empires" ? (
          empires.length === 0 ? (
            <EmptyState icon={Globe2} title="No Empires Registered" subtitle="Register your empire to join the federation mesh." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {empires.map((empire) => (
                <EmpireCard key={empire.id} empire={empire} />
              ))}
            </div>
          )
        ) : activeTab === "trades" ? (
          trades.length === 0 ? (
            <EmptyState icon={ArrowRightLeft} title="No Trades Yet" subtitle="Connect with other empires to start trading resources." />
          ) : (
            <div className="space-y-3">
              {trades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )
        ) : intelligence.length === 0 ? (
          <EmptyState icon={Brain} title="Intel Feed Empty" subtitle="Share intelligence to populate the federation feed." />
        ) : (
          <div className="space-y-3">
            {intelligence.map((intel) => (
              <IntelCard key={intel.id} intel={intel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: typeof Globe2; title: string; subtitle: string }) {
  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-12 text-center">
        <Icon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function EmpireCard({ empire }: { empire: Empire }) {
  const trustColor =
    empire.trust_score >= 80 ? "text-green-400" : empire.trust_score >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <Card className="hover:border-cyan-500/50 transition-colors group">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-lg group-hover:text-cyan-400 transition-colors">
              {empire.empire_name}
            </h3>
            {empire.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{empire.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${trustColor}`}>{Math.round(empire.trust_score)}</div>
            <p className="text-[10px] text-muted-foreground uppercase">Trust</p>
          </div>
        </div>

        <Progress value={empire.trust_score} className="h-1.5 mb-3" />

        {empire.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {empire.capabilities.slice(0, 5).map((cap) => (
              <Badge key={cap} variant="outline" className="text-[10px]">
                {cap}
              </Badge>
            ))}
            {empire.capabilities.length > 5 && (
              <Badge variant="secondary" className="text-[10px]">
                +{empire.capabilities.length - 5}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" /> {empire.total_trades} trades
          </span>
          <span className="flex items-center gap-1">
            <Brain className="w-3 h-3" /> {empire.total_intelligence_shared} intel
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {empire.agents_available.length} agents
          </span>
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs">
            <Handshake className="w-3 h-3" /> Connect
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs">
            <Send className="w-3 h-3" /> Propose Trade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TradeCard({ trade }: { trade: Trade }) {
  const TradeIcon = tradeTypeIcons[trade.trade_type] || ArrowRightLeft;
  const statusColor: Record<string, string> = {
    proposed: "bg-blue-500",
    accepted: "bg-yellow-500",
    active: "bg-green-500",
    completed: "bg-purple-500",
    disputed: "bg-red-500",
    cancelled: "bg-gray-500",
  };

  return (
    <Card className="hover:border-purple-500/50 transition-colors">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
          <TradeIcon className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold truncate">{trade.resource_name}</h4>
            <Badge className={`${statusColor[trade.status] || "bg-gray-500"} text-[10px]`}>
              {trade.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {trade.trade_type.replace("_", " ")} · {new Date(trade.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right shrink-0">
          {trade.price_agt > 0 && <p className="text-sm font-bold">{trade.price_agt} AGT</p>}
          {trade.price_ugt > 0 && <p className="text-xs text-muted-foreground">{trade.price_ugt} UGT</p>}
          {trade.rating && (
            <div className="flex items-center gap-0.5 mt-1 justify-end">
              {Array.from({ length: trade.rating }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function IntelCard({ intel }: { intel: Intelligence }) {
  return (
    <Card className="hover:border-pink-500/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Badge className={`${intelTypeColors[intel.intel_type] || "bg-gray-500"} text-[10px] uppercase shrink-0 mt-1`}>
            {intel.intel_type}
          </Badge>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold">{intel.title}</h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{intel.summary}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Confidence: {Math.round(intel.confidence * 100)}%</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {intel.upvotes}
              </span>
              {intel.is_verified && (
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              )}
              <span>{new Date(intel.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
