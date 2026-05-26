"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileText, Folder, FolderOpen, ChevronRight, ChevronDown,
  Copy, Check, Download, Loader2, Code2, AlertTriangle
} from "lucide-react";
import hljs from "highlight.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  language?: string;
}

interface AppEditorProps {
  jobId: string;
  /** Pre-loaded files map (path → content) */
  initialFiles?: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    css: "css", json: "json", md: "markdown", sql: "sql",
    html: "html", sh: "bash", yml: "yaml", yaml: "yaml",
    env: "bash", toml: "toml", dockerfile: "dockerfile",
  };
  return map[ext] ?? "plaintext";
}

function getFileIcon(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const icons: Record<string, string> = {
    ts: "🔷", tsx: "⚛️", js: "🟨", jsx: "⚛️", css: "🎨",
    json: "📋", md: "📝", sql: "🗄️", html: "🌐",
    env: "🔒", sh: "⚡", yml: "⚙️", yaml: "⚙️",
  };
  return icons[ext] ?? "📄";
}

function buildTree(files: Record<string, string>): FileNode[] {
  const root: Record<string, FileNode> = {};

  Object.keys(files).sort().forEach((path) => {
    const parts = path.split("/");
    let current = root;

    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      if (!current[part]) {
        current[part] = {
          name: part,
          path: fullPath,
          type: isLast ? "file" : "directory",
          language: isLast ? getLanguage(part) : undefined,
          children: isLast ? undefined : [],
        };
      }

      if (!isLast) {
        if (!current[part].children) current[part].children = [];
        const childMap: Record<string, FileNode> = {};
        current[part].children!.forEach((c) => { childMap[c.name] = c; });
        current = childMap;
      }
    });
  });

  function toArray(map: Record<string, FileNode>): FileNode[] {
    return Object.values(map).sort((a, b) => {
      // Directories first, then files
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function sortTree(nodes: FileNode[]): FileNode[] {
    return nodes.map((n) => ({
      ...n,
      children: n.children ? sortTree(toArray(
        Object.fromEntries(n.children.map((c) => [c.name, c]))
      )) : undefined,
    }));
  }

  return sortTree(toArray(root));
}

// ─── FileTree component ───────────────────────────────────────────────────────

function FileTree({
  nodes,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  nodes: FileNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set());

  function toggleDir(path: string) {
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <div className={depth > 0 ? "pl-3 border-l border-white/5" : ""}>
      {nodes.map((node) => {
        const isOpen = openDirs.has(node.path);
        const isSelected = selectedPath === node.path;

        if (node.type === "directory") {
          return (
            <div key={node.path}>
              <button
                type="button"
                onClick={() => toggleDir(node.path)}
                className="flex items-center gap-1.5 w-full px-2 py-1 rounded-lg text-left text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              >
                {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {isOpen ? <FolderOpen size={12} className="text-amber-400/70" /> : <Folder size={12} className="text-amber-400/50" />}
                <span>{node.name}</span>
              </button>
              {isOpen && node.children && (
                <FileTree nodes={node.children} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
              )}
            </div>
          );
        }

        return (
          <button
            key={node.path}
            type="button"
            onClick={() => onSelect(node.path)}
            className={`flex items-center gap-1.5 w-full px-2 py-1 rounded-lg text-left text-xs transition-all ${
              isSelected
                ? "bg-brand-500/15 text-brand-300 border border-brand-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <span className="text-[10px] shrink-0">{getFileIcon(node.name)}</span>
            <span className="truncate">{node.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main AppEditor ───────────────────────────────────────────────────────────

export function AppEditor({ jobId, initialFiles }: AppEditorProps) {
  const [files, setFiles] = useState<Record<string, string>>(initialFiles ?? {});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialFiles);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load files from Supabase job_results if not pre-loaded
  useEffect(() => {
    if (initialFiles) return;
    async function loadFiles() {
      try {
        const res = await fetch(`/api/manifest/status?id=${jobId}`);
        if (!res.ok) throw new Error(`Failed to load build results: ${res.status}`);
        const data = await res.json();
        if (data.files && typeof data.files === "object") {
          setFiles(data.files as Record<string, string>);
          // Auto-select first file
          const firstFile = Object.keys(data.files)[0];
          if (firstFile) setSelectedPath(firstFile);
        } else {
          setError("No generated files found for this build.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load files");
      } finally {
        setLoading(false);
      }
    }
    loadFiles();
  }, [jobId, initialFiles]);

  // Auto-select first file when files load
  useEffect(() => {
    if (!selectedPath && Object.keys(files).length > 0) {
      setSelectedPath(Object.keys(files).sort()[0]);
    }
  }, [files, selectedPath]);

  const tree = useMemo(() => buildTree(files), [files]);

  const selectedContent = selectedPath ? files[selectedPath] : null;
  const language = selectedPath ? getLanguage(selectedPath) : "plaintext";

  // Syntax highlight
  const highlightedCode = useMemo(() => {
    if (!selectedContent) return "";
    try {
      const result = language !== "plaintext"
        ? hljs.highlight(selectedContent, { language })
        : hljs.highlightAuto(selectedContent);
      return result.value;
    } catch {
      return selectedContent.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }, [selectedContent, language]);

  async function handleCopy() {
    if (!selectedContent) return;
    await navigator.clipboard.writeText(selectedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!selectedContent || !selectedPath) return;
    const blob = new Blob([selectedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedPath.split("/").pop() ?? "file.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const fileCount = Object.keys(files).length;
  const totalLines = selectedContent?.split("\n").length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading generated files…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        <AlertTriangle size={14} className="shrink-0" />
        {error}
      </div>
    );
  }

  if (fileCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Code2 size={32} className="opacity-20" />
        <p className="text-sm">No files generated yet. Start a build to see your code here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] rounded-2xl border border-white/8 overflow-hidden bg-black/30">
      {/* Sidebar — file tree */}
      <div className="w-56 shrink-0 border-r border-white/8 flex flex-col">
        <div className="px-3 py-2.5 border-b border-white/8 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Files</span>
          <span className="text-xs text-muted-foreground/50">{fileCount}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <FileTree nodes={tree} selectedPath={selectedPath} onSelect={setSelectedPath} />
        </div>
      </div>

      {/* Editor pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedPath && (
              <>
                <FileText size={12} className="text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{selectedPath}</span>
                <span className="text-xs text-muted-foreground/40 shrink-0 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                  {language}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedContent && (
              <span className="text-xs text-muted-foreground/40">{totalLines} lines</span>
            )}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!selectedContent}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-white/5"
            >
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!selectedContent}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <Download size={11} />
              Save
            </button>
          </div>
        </div>

        {/* Code area */}
        <div className="flex-1 overflow-auto">
          {selectedContent ? (
            <div className="flex min-h-full">
              {/* Line numbers */}
              <div className="select-none px-3 py-4 text-right font-mono text-xs text-muted-foreground/25 border-r border-white/5 bg-black/20 shrink-0 min-w-[3rem]">
                {selectedContent.split("\n").map((_, i) => (
                  <div key={i} className="leading-6">{i + 1}</div>
                ))}
              </div>
              {/* Code */}
              <pre className="flex-1 p-4 font-mono text-xs leading-6 overflow-x-auto">
                <code
                  className={`language-${language}`}
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground/30 text-sm">
              Select a file to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
