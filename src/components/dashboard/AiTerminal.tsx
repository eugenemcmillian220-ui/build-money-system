"use client";

import { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Send, Loader2 } from "lucide-react";

interface ManifestOptions {
  mode?: string;
  protocol?: string;
  theme?: string;
  primaryColor?: string;
}

interface AiTerminalProps {
  onManifest: (prompt: string, options: ManifestOptions) => Promise<void>;
}

export function AiTerminal({ onManifest }: AiTerminalProps) {
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
      addLine("output", "  status           - Check platform health");
      addLine("output", "  clear            - Clear terminal");
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
