"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { FileText, FolderOpen, Code2, Copy, Check, ChevronRight, ChevronDown } from "lucide-react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

interface LiveCodePanelProps {
  files: Record<string, string> | null;
  currentStage: string;
  spec?: { name?: string; featureCount?: number } | null;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isFile: boolean;
}

function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const filePath of paths.sort()) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");
      let existing = current.find((n) => n.name === part);

      if (!existing) {
        existing = { name: part, path: fullPath, children: [], isFile };
        current.push(existing);
      }
      current = existing.children;
    }
  }

  return root;
}

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "tsx";
    case "js":
    case "jsx":
      return "jsx";
    case "css":
      return "css";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "sql":
      return "sql";
    case "sh":
      return "bash";
    default:
      return "typescript";
  }
}

function FileTreeItem({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = node.path === selectedPath;

  if (node.isFile) {
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-[11px] font-mono transition-colors rounded-md ${
          isSelected
            ? "bg-brand-500/20 text-brand-400"
            : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileText size={12} className="shrink-0 opacity-50" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <FolderOpen size={12} className="opacity-50" />
        <span>{node.name}</span>
      </button>
      {expanded && node.children.map((child) => (
        <FileTreeItem
          key={child.path}
          node={child}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export function LiveCodePanel({ files, currentStage, spec }: LiveCodePanelProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const filePaths = useMemo(() => (files ? Object.keys(files) : []), [files]);
  const fileTree = useMemo(() => buildFileTree(filePaths), [filePaths]);

  useEffect(() => {
    if (filePaths.length > 0 && (!selectedFile || !filePaths.includes(selectedFile))) {
      const mainFile = filePaths.find((p) => p.includes("page.tsx"))
        ?? filePaths.find((p) => p.includes("layout.tsx"))
        ?? filePaths[0];
      setSelectedFile(mainFile);
    }
  }, [filePaths, selectedFile]);

  useEffect(() => {
    let cancelled = false;
    async function loadAndHighlight() {
      // Load languages dynamically in dependency order (tsx depends on typescript)
      await import("prismjs/components/prism-typescript");
      await import("prismjs/components/prism-tsx");
      await import("prismjs/components/prism-jsx");
      await import("prismjs/components/prism-css");
      await import("prismjs/components/prism-json");
      await import("prismjs/components/prism-markdown");
      await import("prismjs/components/prism-sql");
      await import("prismjs/components/prism-bash");
      if (!cancelled && codeRef.current) {
        Prism.highlightElement(codeRef.current);
      }
    }
    loadAndHighlight();
    return () => { cancelled = true; };
  }, [selectedFile, files]);

  const handleCopy = async () => {
    if (!selectedFile || !files?.[selectedFile]) return;
    await navigator.clipboard.writeText(files[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fileContent = selectedFile && files ? files[selectedFile] : null;
  const language = selectedFile ? getLanguage(selectedFile) : "typescript";

  const stageLabel = (() => {
    switch (currentStage) {
      case "queued": return "Queued";
      case "intent": return "Analyzing Intent";
      case "generate-plan": return "Planning Architecture";
      case "generate-build": return "Generating Code";
      case "generate": return "Generating Code";
      case "polish": return "Polishing & Auditing";
      case "persist": return "Saving Project";
      case "complete": return "Complete";
      case "error": return "Error";
      default: return currentStage;
    }
  })();

  if (!files || filePaths.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-black border border-white/10 rounded-2xl">
        <Code2 size={48} className="text-brand-500/30 mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-white/30 mb-2">
          Live Code View
        </p>
        <p className="text-xs text-white/20 max-w-xs">
          {currentStage === "queued" || currentStage === "intent" || currentStage === "generate-plan"
            ? `${stageLabel}... Code will appear here once generation begins.`
            : "Waiting for manifestation to start..."}
        </p>
        {spec?.name && (
          <p className="text-xs text-brand-400/60 mt-4 font-bold italic">
            {spec.name} — {spec.featureCount ?? 0} features planned
          </p>
        )}
        <div className="mt-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-500/60">
            {stageLabel}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-brand-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Live Code View
          </span>
          <span className="text-[10px] text-brand-400/60 font-bold ml-2">
            {filePaths.length} files
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${currentStage === "complete" ? "bg-green-500" : currentStage === "error" ? "bg-red-500" : "bg-brand-500 animate-pulse"}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
            {stageLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* File Tree */}
        <div className="w-48 border-r border-white/10 overflow-y-auto custom-scrollbar py-2 shrink-0">
          {fileTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              selectedPath={selectedFile}
              onSelect={setSelectedFile}
              depth={0}
            />
          ))}
        </div>

        {/* Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedFile && (
            <div className="bg-white/5 px-4 py-1.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-mono text-white/50 truncate">{selectedFile}</span>
              <button
                onClick={handleCopy}
                className="text-white/30 hover:text-white transition-colors shrink-0 ml-2"
                title="Copy file contents"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto custom-scrollbar p-4">
            {fileContent ? (
              <pre className="text-xs leading-relaxed">
                <code ref={codeRef} className={`language-${language}`}>
                  {fileContent}
                </code>
              </pre>
            ) : (
              <p className="text-xs text-white/20 italic">Select a file to view its contents.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
