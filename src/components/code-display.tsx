"use client";

import { useRef, useState } from "react";

interface CodeDisplayProps {
  code: string;
  isStreaming?: boolean;
}

export function CodeDisplay({ code, isStreaming = false }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);
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
    </section>
  );
}
