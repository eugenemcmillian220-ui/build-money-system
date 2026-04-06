"use client";

import { useRef, useState } from "react";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from "react-live";

interface CodeDisplayProps {
  code: string;
  isStreaming?: boolean;
}

export function CodeDisplay({ code, isStreaming = false }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const preRef = useRef<HTMLPreElement>(null);

  if (!code && !isStreaming) return null;

  async function handleCopy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = preRef.current;
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }

  return (
    <section className="relative mt-8 overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "oklch(0.14 0 0)", borderBottom: "1px solid oklch(0.22 0 0)" }}
      >
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <span className="ml-2 font-mono text-xs" style={{ color: "oklch(0.55 0 0)" }}>
            generated-component.tsx
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-black/20 rounded-lg p-1 mr-2">
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                activeTab === "code" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                activeTab === "preview" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              Preview
            </button>
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.6 0.15 145)" }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Streaming
            </span>
          )}
          <button
            onClick={handleCopy}
            disabled={!code}
            className="rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40"
            style={{
              background: "oklch(0.22 0 0)",
              color: copied ? "oklch(0.6 0.15 145)" : "oklch(0.7 0 0)",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>
      {activeTab === "code" ? (
        <pre
          ref={preRef}
          className="overflow-x-auto p-5 text-sm leading-relaxed"
          style={{ background: "oklch(0.11 0 0)", color: "oklch(0.85 0.08 145)" }}
        >
          <code>{code || " "}</code>
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
              style={{ background: "oklch(0.7 0 0)" }}
              aria-hidden
            />
          )}
        </pre>
      ) : (
        <div className="p-6 bg-white rounded-b-xl min-h-[300px]">
          <LiveProvider code={code} noInline>
            <div className="flex flex-col gap-4">
              <LivePreview className="preview-container border border-gray-100 rounded-lg p-4 text-black" />
              <LiveError className="text-xs text-red-500 font-mono bg-red-50 p-3 rounded-lg" />
            </div>
          </LiveProvider>
        </div>
      )}
    </section>
  );
}
