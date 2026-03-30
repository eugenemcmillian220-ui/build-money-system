"use client";

import { useState, useRef } from "react";
import { FileMap } from "@/lib/types";
import { FileExplorer } from "@/components/file-explorer";
import { LivePreview } from "@/components/live-preview";

interface MultiFileDisplayProps {
  files: FileMap;
  isStreaming?: boolean;
}

export function MultiFileDisplay({ files, isStreaming = false }: MultiFileDisplayProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const filePaths = Object.keys(files);
  
  // Auto-select first file when files are available
  if (!selectedFile && filePaths.length > 0) {
    setSelectedFile(filePaths[0]);
  }

  const selectedContent = selectedFile ? files[selectedFile] : null;

  async function handleCopy() {
    if (!selectedContent) return;
    try {
      await navigator.clipboard.writeText(selectedContent);
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

  const canPreview = selectedFile?.endsWith(".tsx") || selectedFile?.endsWith(".ts");

  return (
    <div className="mt-8">
      <div
        className="grid rounded-xl border overflow-hidden"
        style={{
          borderColor: "var(--border)",
          background: "var(--muted)",
          gridTemplateColumns: "250px 1fr",
          minHeight: "400px",
        }}
      >
        {/* File Explorer Sidebar */}
        <div className="border-r" style={{ borderColor: "var(--border)" }}>
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onSelectFile={(path) => {
              setSelectedFile(path);
              setShowPreview(false);
            }}
          />
        </div>

        {/* Content Area */}
        <div className="flex flex-col">
          {/* Toolbar */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{
              background: "oklch(0.14 0 0)",
              borderBottom: "1px solid oklch(0.22 0 0)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
              <span className="ml-2 font-mono text-xs" style={{ color: "oklch(0.55 0 0)" }}>
                {selectedFile || "Select a file"}
              </span>
              {isStreaming && (
                <span className="flex items-center gap-1.5 text-xs ml-2" style={{ color: "oklch(0.6 0.15 145)" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Generating...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canPreview && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded px-2.5 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: showPreview ? "oklch(0.68 0.15 264 / 0.3)" : "oklch(0.22 0 0)",
                    color: showPreview ? "var(--ring)" : "oklch(0.7 0 0)",
                  }}
                >
                  {showPreview ? "Hide Preview" : "Preview"}
                </button>
              )}
              <button
                onClick={handleCopy}
                disabled={!selectedContent}
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

          {/* Preview (if enabled and available) */}
          {showPreview && selectedContent && (
            <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <LivePreview code={selectedContent} />
            </div>
          )}

          {/* Code Display */}
          <pre
            ref={preRef}
            className="flex-1 overflow-auto p-5 text-sm leading-relaxed"
            style={{ background: "oklch(0.11 0 0)", color: "oklch(0.85 0.08 145)" }}
          >
            <code>
              {selectedContent || " "}
              {isStreaming && (
                <span
                  className="ml-0.5 inline-block h-4 w-0.5 animate-pulse"
                  style={{ background: "oklch(0.7 0 0)" }}
                  aria-hidden
                />
              )}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
