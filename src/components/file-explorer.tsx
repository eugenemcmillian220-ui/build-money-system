"use client";

import { FileMap, FileType, detectFileType } from "@/lib/types";

interface FileExplorerProps {
  files: FileMap;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

const fileIcons: Record<FileType, string> = {
  "tsx-component": "⚛️",
  tsx: "📄",
  ts: "📘",
  css: "🎨",
  json: "📋",
  other: "📁",
};

function FileIcon({ type }: { type: FileType }) {
  return <span className="mr-2">{fileIcons[type]}</span>;
}

export function FileExplorer({ files, selectedFile, onSelectFile }: FileExplorerProps) {
  const filePaths = Object.keys(files);

  return (
    <div
      className="flex flex-col rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--border)", background: "var(--muted)" }}
    >
      <div
        className="px-3 py-2 text-xs font-semibold uppercase tracking-wider"
        style={{
          background: "oklch(0.14 0 0)",
          color: "var(--muted-foreground)",
          borderBottom: "1px solid oklch(0.22 0 0)",
        }}
      >
        Files ({filePaths.length})
      </div>
      <div className="flex-1 overflow-auto p-2">
        {filePaths.length === 0 ? (
          <p className="text-xs p-2" style={{ color: "var(--muted-foreground)" }}>
            No files generated yet
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filePaths.map((path) => {
              const isSelected = selectedFile === path;
              const fileType = detectFileType(path);
              const fileName = path.split("/").pop() ?? path;

              return (
                <li key={path}>
                  <button
                    onClick={() => onSelectFile(path)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center truncate ${
                      isSelected
                        ? "font-medium"
                        : "hover:opacity-80"
                    }`}
                    style={{
                      background: isSelected ? "oklch(0.28 0.15 264 / 0.3)" : "transparent",
                      color: isSelected ? "var(--ring)" : "var(--foreground)",
                    }}
                    title={path}
                  >
                    <FileIcon type={fileType} />
                    <span className="truncate">{fileName}</span>
                    {isSelected && (
                      <span
                        className="ml-auto text-xs truncate max-w-[100px]"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {path.replace(`/${fileName}`, "") || "/"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
