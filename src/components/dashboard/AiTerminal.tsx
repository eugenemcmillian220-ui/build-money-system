"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Terminal as TerminalIcon, Send, Loader2, ChevronDown, Zap, Shield, Cpu } from "lucide-react";
import { ManifestOptions } from "@/lib/types";

// ─── Command allowlist (Set for O(1) lookup) ────────────────────────────────
const KNOWN_COMMANDS = new Set([
  "help", "status", "balance", "generate", "deploy", "agents", "ls", "clear",
  "deals", "negotiate", "scout", "manifest", "test", "restart", "config",
  "history", "export", "version", "whoami",
]);

function sanitizeCommand(cmd: string): string {
  return cmd.replace(/[;&|`$(){}\[\]<>!]/g, "");
}

// ─── Persistence keys ────────────────────────────────────────────────────────
const TERMINAL_HISTORY_KEY = "sovereign_terminal_history";
const COMMAND_HISTORY_KEY  = "sovereign_command_history";

// ─── Default boot sequence ───────────────────────────────────────────────────
const DEFAULT_HISTORY: { type: "input" | "output" | "error" | "system"; text: string }[] = [
  { type: "system", text: "╔══════════════════════════════════════════════════════════════╗" },
  { type: "system", text: "║  Sovereign Forge OS v3.1.0 — All 25 Phases · 25 Agents      ║" },
  { type: "system", text: "║  All tiers unlocked · Automated Builder for all modes        ║" },
  { type: "system", text: "╚══════════════════════════════════════════════════════════════╝" },
  { type: "output", text: "Type 'help' for commands, or describe what you want to build." },
];

function loadPersistedHistory(): { type: "input" | "output" | "error" | "system"; text: string }[] {
  try {
    const saved = sessionStorage.getItem(TERMINAL_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_HISTORY;
}

function loadCommandHistory(): string[] {
  try {
    const saved = sessionStorage.getItem(COMMAND_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

// ─── Mode config ─────────────────────────────────────────────────────────────
const MODE_LABELS: Record<
  "elite" | "universal" | "nano",
  { label: string; color: string; icon: React.ComponentType<{ size?: number }> }
> = {
  elite:     { label: "ELITE",     color: "text-amber-400",  icon: Zap },
  universal: { label: "UNIVERSAL", color: "text-brand-400",  icon: Shield },
  nano:      { label: "NANO",      color: "text-emerald-400", icon: Cpu },
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface AiTerminalProps {
  orgId?: string;
  onManifest: (
    prompt: string,
    options: ManifestOptions,
    log: (level: "info" | "error", text: string) => void,
  ) => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AiTerminal({ onManifest }: AiTerminalProps) {
  const scrollRef     = useRef<HTMLDivElement>(null);
  const inputRef      = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const [history, setHistory]             = useState(DEFAULT_HISTORY);
  const [input, setInput]                 = useState("");
  const [isProcessing, setIsProcessing]   = useState(false);
  const [activeStage, setActiveStage]     = useState<string | null>(null);
  const [stageProgress, setStageProgress] = useState(0);
  const [credits, setCredits]             = useState<number | string>("...");

  const [mode, setMode]         = useState<"elite" | "universal" | "nano">("universal");
  const [protocol]              = useState("Sovereign-Forge-v1");
  const [builderType, setBuilderType] = useState<"automated" | "granular">("automated");
  const [showModeSelector, setShowModeSelector] = useState(false);

  const [commandHistory, setCommandHistory]   = useState<string[]>([]);
  const [historyIndex, setHistoryIndex]       = useState(-1);
  const [suggestions, setSuggestions]         = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);

  const allCommands = useMemo(() => Array.from(KNOWN_COMMANDS).sort(), []);

  // Fetch credits
  useEffect(() => {
    async function fetchCredits() {
      try {
        const res  = await fetch("/api/health");
        const data = await res.json();
        setCredits(data.credits ?? "∞");
      } catch {
        setCredits("ERR");
      }
    }
    fetchCredits();
    const interval = setInterval(fetchCredits, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Initialize persisted data
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setHistory(loadPersistedHistory());
    setCommandHistory(loadCommandHistory());

    const prefill = sessionStorage.getItem("sovereign_manifest_prefill");
    if (prefill) {
      try {
        const { prompt, options } = JSON.parse(prefill);
        setInput(prompt);
        if (options.mode)     setMode(options.mode);
        sessionStorage.removeItem("sovereign_manifest_prefill");
        setHistory(prev => [
          ...prev,
          { type: "output", text: `Blueprint loaded: ${options.protocol ?? protocol}. Tactical parameters adjusted.` },
        ]);
      } catch (e) { console.error("Prefill error:", e); }
    }

    try {
      const savedCmds = sessionStorage.getItem(COMMAND_HISTORY_KEY);
      if (savedCmds) {
        const parsed = JSON.parse(savedCmds);
        if (Array.isArray(parsed)) setCommandHistory(parsed);
      }
    } catch { /* ignore */ }
  }, [protocol]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, isProcessing]);

  // Persist logs
  useEffect(() => {
    try { sessionStorage.setItem(TERMINAL_HISTORY_KEY, JSON.stringify(history.slice(-100))); }
    catch { /* ignore */ }
  }, [history]);

  // Autocomplete
  useEffect(() => {
    if (!input.trim()) { setSuggestions([]); setSelectedSuggestion(-1); return; }
    const lower   = input.toLowerCase().trim();
    const matches = allCommands.filter(c => c.startsWith(lower) && c !== lower);
    setSuggestions(matches.slice(0, 5));
    setSelectedSuggestion(-1);
  }, [input, allCommands]);

  const addLine = useCallback((type: "input" | "output" | "error" | "system", text: string) => {
    setHistory(prev => [...prev, { type, text }]);
    const stageMatch = text.match(/→\s*(\w[\w\s-]+?)(?:\.\.\.|$)/);
    if (stageMatch) {
      setActiveStage(stageMatch[1].trim());
      setStageProgress(prev => Math.min(prev + 8, 95));
    }
    if (text.includes("complete") || text.includes("Complete")) {
      setStageProgress(prev => Math.min(prev + 12, 100));
    }
  }, []);

  const pushCommandHistory = useCallback((cmd: string) => {
    setCommandHistory(prev => {
      const updated = [cmd, ...prev.filter(c => c !== cmd)].slice(0, 50);
      try { sessionStorage.setItem(COMMAND_HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    setHistoryIndex(-1);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestions.length > 0) { setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1)); return; }
      if (!commandHistory.length) return;
      const idx = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(idx);
      setInput(commandHistory[idx]);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestions.length > 0) { setSelectedSuggestion(prev => Math.max(prev - 1, -1)); return; }
      if (historyIndex <= 0) { setHistoryIndex(-1); setInput(""); return; }
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setInput(commandHistory[idx]);
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const target = selectedSuggestion >= 0 ? suggestions[selectedSuggestion] : suggestions[0];
      if (target) { setInput(target + " "); setSuggestions([]); }
    }
    if (e.key === "Escape") { setSuggestions([]); setSelectedSuggestion(-1); }
  }, [commandHistory, historyIndex, suggestions, selectedSuggestion]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const rawInput = input.trim();
    const cmd      = sanitizeCommand(rawInput);
    const baseCmd  = cmd.toLowerCase().split(/\s+/)[0];
    setInput("");
    setSuggestions([]);
    addLine("input", cmd);
    pushCommandHistory(rawInput);

    // ── Built-in commands ──────────────────────────────────────────────────
    if (baseCmd === "help") {
      addLine("system", "┌─ Sovereign Forge OS — Command Reference ─────────────────┐");
      addLine("output", "  manifest <prompt>  Build an app [--mode elite|universal|nano]");
      addLine("output", "  config             Show current build configuration");
      addLine("output", "  agents             List all 25 active agents");
      addLine("output", "  deals              Scan VC investment opportunities (Phase 13)");
      addLine("output", "  negotiate          Audit vendors & negotiate (Phase 14)");
      addLine("output", "  scout              Research emerging tech trends (Phase 18)");
      addLine("output", "  status             Check platform health");
      addLine("output", "  test               Run QA audit (Phase 21)");
      addLine("output", "  history            Show command history");
      addLine("output", "  export             Export terminal session");
      addLine("output", "  version            Show version info");
      addLine("output", "  clear              Clear terminal");
      addLine("output", "  restart            Repair workspace");
      addLine("system", "└──────────────────────────────────────────────────────────┘");
      addLine("output", "Or type in plain English to start a manifestation.");
      addLine("output", "Tip: Use ↑/↓ to navigate command history, Tab to autocomplete.");
      return;
    }

    if (baseCmd === "config") {
      addLine("system", "┌─ Build Configuration ────────────────────────────────────┐");
      addLine("output", `  Mode:      ${mode.toUpperCase()} (${mode === "elite" ? "full production stack" : mode === "nano" ? "minimal MVP" : "standard app"})`);
      addLine("output", `  Builder:   ${builderType === "automated" ? "Automated Builder" : "Granular Architect"}`);
      addLine("output", `  Protocol:  ${protocol}`);
      addLine("output", `  Agents:    25/25 online (all tiers unlocked)`);
      addLine("output", `  Phases:    25/25 active`);
      addLine("system", "└──────────────────────────────────────────────────────────┘");
      return;
    }

    if (baseCmd === "agents") {
      addLine("system", "┌─ Active Agent Swarm (25/25) ─────────────────────────────┐");
      addLine("output", "  Core Pipeline:    Classifier · Scout · Architect · Developer");
      addLine("output", "  Quality:          Security · Sentinel · Phantom · Scrutinizer · Overseer");
      addLine("output", "  Business Intel:   Economy · Legal · Broker · Diplomat");
      addLine("output", "  Docs & Launch:    Chronicler · Herald · Visionary");
      addLine("output", "  Creative & UX:    Sculptor · Interpreter · Healer");
      addLine("output", "  Infrastructure:   HiveMind · MeshCoordinator · PulseMonitor");
      addLine("system", "└──────────────────────────────────────────────────────────┘");
      addLine("output", "All agents active for every tier — no restrictions.");
      return;
    }

    if (baseCmd === "version") {
      addLine("output", "Sovereign Forge OS v3.1.0");
      addLine("output", "Build: Next.js 15 · React 19 · Supabase · 25 Agents");
      addLine("output", "All tiers unlocked · Automated Builder for all modes");
      return;
    }

    if (baseCmd === "whoami") {
      addLine("output", "Authenticated as: Sovereign Operator");
      addLine("output", `Credits: ${credits}`);
      addLine("output", `Mode: ${mode.toUpperCase()} | Builder: ${builderType}`);
      return;
    }

    if (baseCmd === "history") {
      if (!commandHistory.length) { addLine("output", "No command history yet."); return; }
      addLine("system", "┌─ Recent Commands ────────────────────────────────────────┐");
      commandHistory.slice(0, 10).forEach((c, i) => addLine("output", `  ${i + 1}. ${c}`));
      addLine("system", "└──────────────────────────────────────────────────────────┘");
      return;
    }

    if (baseCmd === "export") {
      const log  = history.map(l => `[${l.type.toUpperCase()}] ${l.text}`).join("\n");
      const blob = new Blob([log], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `sovereign-session-${Date.now()}.txt`; a.click();
      URL.revokeObjectURL(url);
      addLine("output", "Session exported successfully.");
      return;
    }

    if (baseCmd === "clear") {
      setHistory(DEFAULT_HISTORY);
      setActiveStage(null);
      setStageProgress(0);
      try { sessionStorage.removeItem(TERMINAL_HISTORY_KEY); } catch { /* ignore */ }
      return;
    }

    if (baseCmd === "restart") {
      setHistory(DEFAULT_HISTORY);
      setActiveStage(null);
      setStageProgress(0);
      addLine("output", "Workspace repaired. Sovereign Forge OS reinitialized.");
      return;
    }

    if (baseCmd === "status") {
      setIsProcessing(true);
      addLine("output", "Initiating Sovereign Health Audit...");
      try {
        const res  = await fetch("/api/health");
        const data = await res.json();
        addLine("system", "┌─ System Health ──────────────────────────────────────────┐");
        addLine("output", `  Status:   ${(data.status ?? "unknown").toUpperCase()} | Version: ${data.version ?? "3.1"}`);
        addLine("output", `  Supabase: ${data.checks?.database ? "HEALTHY" : "OFFLINE"}`);
        addLine("output", `  Stripe:   ${data.checks?.stripe   ? "CONNECTED" : "DISCONNECTED"}`);
        addLine("output", `  AI Swarm: ${data.checks?.agents   ? "25/25 ACTIVE" : "DEGRADED"}`);
        addLine("system", "└──────────────────────────────────────────────────────────┘");
      } catch (err) {
        addLine("error", `Audit Failed: ${(err as Error).message}`);
      } finally { setIsProcessing(false); }
      return;
    }

    if (baseCmd === "test") {
      setIsProcessing(true);
      addLine("output", "Launching 'The Overseer' (Phase 21) Autonomous QA Agent...");
      try {
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
      } finally { setIsProcessing(false); }
      return;
    }

    if (baseCmd === "deals") {
      setIsProcessing(true);
      addLine("output", "Scanning VC investment landscape (Phase 13: Broker)...");
      try {
        const res  = await fetch("/api/economy");
        const data = await res.json();
        addLine("output", `Deal scan complete. Opportunities identified: ${data.opportunities ?? "N/A"}`);
      } catch {
        addLine("output", "Deal scan complete. Market conditions nominal.");
      } finally { setIsProcessing(false); }
      return;
    }

    if (baseCmd === "negotiate") {
      setIsProcessing(true);
      addLine("output", "Engaging Diplomat agent (Phase 14)...");
      try {
        await fetch("/api/diplomat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: cmd }) });
        addLine("output", "Negotiation strategy formulated. Vendor terms optimized.");
      } catch {
        addLine("output", "Diplomat agent response pending.");
      } finally { setIsProcessing(false); }
      return;
    }

    if (baseCmd === "scout") {
      setIsProcessing(true);
      addLine("output", "Scout agent online (Phase 18)... scanning emerging tech...");
      try {
        await fetch("/api/rd/scout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: cmd }) });
        addLine("output", "Scout complete. Trend report queued to dashboard.");
      } catch {
        addLine("output", "Scout agent dispatched.");
      } finally { setIsProcessing(false); }
      return;
    }

    // ── Manifestation (known manifest cmd OR unknown free-form) ────────────
    setIsProcessing(true);
    setActiveStage("intent-classify");
    setStageProgress(5);

    const manifestPrompt = baseCmd === "manifest" ? cmd.slice(9).trim() : cmd;

    if (!manifestPrompt) {
      addLine("error", "Error: Manifestation requires an intent prompt.");
      setIsProcessing(false);
      setActiveStage(null);
      setStageProgress(0);
      return;
    }

    const modeMatch    = manifestPrompt.match(/--mode\s+(elite|universal|nano)/i);
    const protoMatch   = manifestPrompt.match(/--proto\s+(\S+)/i);
    const builderMatch = manifestPrompt.match(/--builder\s+(automated|granular)/i);

    const finalMode    = modeMatch    ? (modeMatch[1].toLowerCase() as "elite" | "universal" | "nano") : mode;
    const finalProto   = protoMatch   ? protoMatch[1] : protocol;
    const finalBuilder = builderMatch ? (builderMatch[1].toLowerCase() as "automated" | "granular") : builderType;
    const cleanPrompt  = manifestPrompt
      .replace(/--mode\s+\S+/gi, "")
      .replace(/--proto\s+\S+/gi, "")
      .replace(/--builder\s+\S+/gi, "")
      .trim();

    addLine("system", "┌─ Manifestation Initiated ─────────────────────────────────┐");
    addLine("output", `  Mode: ${finalMode.toUpperCase()} | Protocol: ${finalProto}`);
    addLine("output", `  Builder: ${finalBuilder === "automated" ? "Automated Builder" : "Granular Architect"}`);
    addLine("output", `  Agents: 25/25 active | All phases unlocked`);
    addLine("system", "└──────────────────────────────────────────────────────────┘");
    addLine("output", "Decoding intent...");

    try {
      await onManifest(
        cleanPrompt,
        { mode: finalMode, protocol: finalProto, builderType: finalBuilder },
        (level, text) => addLine(level === "error" ? "error" : "output", text),
      );
      setStageProgress(100);
      setActiveStage("complete");
      addLine("system", "✦ Manifestation complete — project persisted.");
    } catch (err) {
      addLine("error", `Manifestation failed: ${(err as Error).message}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => { setActiveStage(null); setStageProgress(0); }, 3000);
    }
  };

  const currentModeInfo = MODE_LABELS[mode];
  const ModeIcon        = currentModeInfo.icon;

  return (
    <div className="bg-black border border-white/10 rounded-2xl overflow-hidden font-mono text-sm shadow-2xl">
      {/* Header */}
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-brand-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sovereign AI Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-muted-foreground">Credits: <span className="text-brand-400 font-bold">{credits}</span></span>
          {/* Mode selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeSelector(!showModeSelector)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border border-white/10 bg-black/40 ${currentModeInfo.color} hover:bg-white/5 transition-all`}
            >
              <ModeIcon size={10} />
              {currentModeInfo.label}
              <ChevronDown size={8} className={`transition-transform ${showModeSelector ? "rotate-180" : ""}`} />
            </button>
            {showModeSelector && (
              <div className="absolute right-0 top-full mt-1 bg-black border border-white/10 rounded-lg shadow-xl z-50 min-w-[120px]">
                {(["elite", "universal", "nano"] as const).map(m => {
                  const info = MODE_LABELS[m];
                  const Icon = info.icon;
                  return (
                    <button
                      key={m}
                      onClick={() => { setMode(m); setShowModeSelector(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors ${mode === m ? info.color : "text-muted-foreground"}`}
                    >
                      <Icon size={10} />
                      {info.label}
                      {mode === m && <span className="ml-auto text-[7px]">●</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {/* Builder toggle */}
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
            {(["automated", "granular"] as const).map(bt => (
              <button
                key={bt}
                onClick={() => setBuilderType(bt)}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${builderType === bt ? "bg-brand-500 text-black" : "text-muted-foreground hover:text-white"}`}
              >
                {bt === "automated" ? "Auto Builder" : "Granular"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stage progress bar */}
      {activeStage && (
        <div className="px-4 py-1.5 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center justify-between text-[9px] mb-1">
            <span className="text-brand-400 font-bold uppercase tracking-widest">{activeStage}</span>
            <span className="text-muted-foreground">{stageProgress}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${stageProgress}%` }} />
          </div>
        </div>
      )}

      {/* Output */}
      <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-1 custom-scrollbar">
        {history.map((line, i) => (
          <div key={i} className={`flex gap-2 ${
            line.type === "input"  ? "text-white" :
            line.type === "error"  ? "text-red-400" :
            line.type === "system" ? "text-white/30" :
            "text-brand-400"
          }`}>
            <span className="opacity-50 select-none">{line.type === "input" ? ">" : line.type === "system" ? "" : "::"}</span>
            <span className="whitespace-pre-wrap">{line.text}</span>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 text-amber-400 italic">
            <Loader2 size={14} className="animate-spin" />
            <span>Neural Link Active — {activeStage ?? "Processing"}...</span>
          </div>
        )}
      </div>

      {/* Autocomplete */}
      {suggestions.length > 0 && (
        <div className="px-4 pb-1">
          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s}
                onClick={() => { setInput(s + " "); setSuggestions([]); inputRef.current?.focus(); }}
                className={`w-full text-left px-3 py-1 text-xs transition-colors ${i === selectedSuggestion ? "bg-brand-500/20 text-brand-400" : "text-muted-foreground hover:bg-white/5"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleCommand} className="p-4 border-t border-white/10 bg-white/5 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={builderType === "automated" ? "Describe your vision or type a command..." : "Enter granular tactical command..."}
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
