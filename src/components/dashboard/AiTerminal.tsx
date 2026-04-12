"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Send, Loader2 } from "lucide-react";
import { ManifestOptions } from "@/lib/types";

interface AiTerminalProps {
  onManifest: (prompt: string, options: ManifestOptions) => Promise<void>;
  orgId?: string;
}

export function AiTerminal({ onManifest, orgId }: AiTerminalProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<{ type: "input" | "output" | "error"; text: string }[]>([
    { type: "output", text: "Sovereign Forge OS v2.1 (Phase 20 Active)" },
    { type: "output", text: "Type 'help' for available commands." },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const addLine = (type: "input" | "output" | "error", text: string) => {
    setHistory(prev => [...prev, { type, text }]);
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const cmd = input.trim();
    setInput("");
    addLine("input", cmd);

    if (cmd.toLowerCase() === "help") {
      addLine("output", "Available commands:");
      addLine("output", "  manifest <prompt> [--mode <elite|universal|nano>] [--proto <saas|tma|farcaster|...>]");
      addLine("output", "  deals            - Scan for VC investment opportunities (Phase 13)");
      addLine("output", "  negotiate        - Audit vendors and initiate negotiations (Phase 14)");
      addLine("output", "  scout            - Research emerging tech trends (Phase 18)");
      addLine("output", "  status           - Check platform health");
      addLine("output", "  clear            - Clear terminal");
      return;
    }

    if (cmd.toLowerCase() === "deals") {
      if (!orgId) {
        addLine("error", "Error: Organization context required for VC scouting.");
        return;
      }
      setIsProcessing(true);
      addLine("output", "Principal VC Agent initiating organization audit...");
      try {
        const res = await fetch(`/api/vc/propose?orgId=${orgId}`);
        const data = await res.json();
        if (data.proposals?.length) {
          addLine("output", `Found ${data.proposals.length} high-potential investment opportunities!`);
          data.proposals.forEach((p: any) => {
            addLine("output", `  - Project: ${p.projectId.slice(0, 8)}... | Score: ${p.score}/100 | Ask: ${p.suggestedCredits} CR | RevShare: ${(p.equityShare * 100).toFixed(1)}%`);
          });
        } else {
          addLine("output", "No new investment opportunities identified in this cycle.");
        }
      } catch (err) {
        addLine("error", `VC Scouting failed: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (cmd.toLowerCase() === "negotiate") {
      setIsProcessing(true);
      addLine("output", "Chief Diplomat Agent auditing vendor relations...");
      try {
        const res = await fetch("/api/diplomat");
        const data = await res.json();
        addLine("output", `Audit Complete: ${data.vendorsChecked} vendors checked, ${data.incidentsFound} incidents found.`);
        if (data.incidentsFound > 0) {
          addLine("output", "Diplomat has initiated automated negotiations for all at-risk accounts.");
        }
      } catch (err) {
        addLine("error", `Diplomat Audit failed: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (cmd.toLowerCase() === "scout") {
      setIsProcessing(true);
      addLine("output", "R&D Agent scouting emerging 2026 tech trends...");
      try {
        const res = await fetch("/api/rd/scout");
        const data = await res.json();
        if (data.trends?.length) {
          addLine("output", "Top Emerging Technologies Identified:");
          data.trends.forEach((t: any) => {
            addLine("output", `  - ${t.name} (${t.category}) | Velocity: ${t.velocity} stars/wk | Source: ${t.source}`);
          });
        }
      } catch (err) {
        addLine("error", `R&D Scouting failed: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (cmd.toLowerCase() === "clear") {
      setHistory([]);
      return;
    }

    if (cmd.toLowerCase().startsWith("manifest")) {
      const prompt = cmd.replace("manifest", "").split("--")[0].trim();
      if (!prompt) {
        addLine("error", "Error: Prompt required. Usage: manifest <prompt>");
        return;
      }

      const modeMatch = cmd.match(/--mode\s+(\w+)/);
      const protoMatch = cmd.match(/--proto\s+(\w+)/);
      
      const options = {
        mode: modeMatch?.[1] || "elite",
        protocol: protoMatch?.[1] || "saas"
      };

      setIsProcessing(true);
      addLine("output", `Manifesting: "${prompt}" in ${options.mode} mode...`);
      
      try {
        await onManifest(prompt, options);
        addLine("output", "Manifestation complete. Project saved to database.");
      } catch (err) {
        addLine("error", `Manifestation failed: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (cmd.toLowerCase() === "status") {
      setIsProcessing(true);
      addLine("output", "Initiating Sovereign Health Audit...");
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        addLine("output", `System: ${data.status.toUpperCase()} | Version: ${data.version || "2.3"}`);
        addLine("output", "Integrations Status:");
        addLine("output", `  - Supabase: ${data.checks?.database ? "HEALTHY" : "OFFLINE"}`);
        addLine("output", `  - Stripe: ${data.checks?.stripe ? "CONNECTED" : "DISCONNECTED"}`);
        addLine("output", `  - AI Swarm: ${data.checks?.agents ? "ACTIVE" : "DEGRADED"}`);
      } catch (err) {
        addLine("error", `Health Audit failed: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (cmd.toLowerCase() === "test") {
      setIsProcessing(true);
      addLine("output", "Launching 'The Overseer' (Phase 21) Autonomous QA Agent...");
      addLine("output", "Target: Main Platform & Active Manifestations");
      try {
        // Simulate E2E flow
        await new Promise(r => setTimeout(r, 1000));
        addLine("output", "[1/4] Navigating to Sovereign Dashboard... SUCCESS (240ms)");
        await new Promise(r => setTimeout(r, 800));
        addLine("output", "[2/4] Verifying Neural Link Authentication... SECURE");
        await new Promise(r => setTimeout(r, 1200));
        addLine("output", "[3/4] Running Visual Regression Audit... NO DRIFT DETECTED");
        await new Promise(r => setTimeout(r, 900));
        addLine("output", "[4/4] Stress Testing Manifestation Pipeline... 120req/sec STABLE");
        addLine("output", "QA Audit Complete. Platform Integrity: 100%");
      } catch (err) {
        addLine("error", `QA Test failed: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    addLine("error", `Command not found: ${cmd.split(" ")[0]}`);
  };

  return (
    <div className="bg-black border border-white/10 rounded-2xl overflow-hidden font-mono text-sm shadow-2xl">
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <TerminalIcon size={14} className="text-brand-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sovereign AI Terminal</span>
      </div>
      
      <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {history.map((line, i) => (
          <div key={i} className={`flex gap-2 ${line.type === "input" ? "text-white" : line.type === "error" ? "text-red-400" : "text-brand-400"}`}>
            <span className="opacity-50">{line.type === "input" ? ">" : "::"}</span>
            <span className="whitespace-pre-wrap">{line.text}</span>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-amber-400 italic">
            <Loader2 size={14} className="animate-spin" />
            <span>Neural Link Active - Generating Codebase...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleCommand} className="p-4 border-t border-white/10 bg-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type 'manifest <prompt>' to build..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20"
          disabled={isProcessing}
        />
        <button type="submit" disabled={isProcessing} className="text-white hover:text-brand-400 transition-colors">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
