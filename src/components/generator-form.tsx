"use client";

import { useRef, useState, useTransition } from "react";
import { CodeDisplay } from "@/components/code-display";
import { MultiFileDisplay } from "@/components/multi-file-display";

type FileMap = Record<string, string>;

type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "streaming"; code: string; files: FileMap }
  | { status: "done"; code: string; files: FileMap }
  | { status: "error"; message: string };

const EXAMPLE_PROMPTS = [
  "Landing page for a fitness app",
  "Dashboard with analytics cards and charts",
  "Pricing table with three tiers",
  "Contact form with validation",
  "E-commerce product card grid",
];

const MULTI_FILE_EXAMPLES = [
  "Full landing page with header, hero, features, and footer",
  "E-commerce product listing with shopping cart",
  "User dashboard with charts and data tables",
  "Blog platform with posts and comments",
  "Todo app with categories and filters",
];

export function GeneratorForm() {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<GenerationState>({ status: "idle" });
  const [multiFileMode, setMultiFileMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isWorking = state.status === "loading" || state.status === "streaming" || isPending;
  const examples = multiFileMode ? MULTI_FILE_EXAMPLES : EXAMPLE_PROMPTS;

  function handleExampleClick(example: string) {
    setPrompt(example);
    textareaRef.current?.focus();
  }

  function handleStop() {
    abortRef.current?.abort();
    if (state.status === "streaming") {
      const emptyFiles: FileMap = {};
      setState({ status: "done", code: state.code, files: emptyFiles });
    } else {
      setState({ status: "idle" });
    }
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || isWorking) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const emptyFiles: FileMap = {};
    setState({ status: "loading", code: "", files: emptyFiles });

    startTransition(async () => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            stream: true,
            multiFile: multiFileMode,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          setState({ status: "error", message: data.error ?? "Generation failed" });
          return;
        }

        if (!response.body) {
          setState({ status: "error", message: "No response body received" });
          return;
        }

        const currentFiles: FileMap = {};
        setState({ status: "streaming", code: "", files: currentFiles });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });

          // Try to parse JSON for multi-file mode
          if (multiFileMode) {
            try {
              const cleaned = accumulated
                .replace(/^```json\n?/g, "")
                .replace(/^```\n?/g, "")
                .replace(/\n?```$/g, "")
                .trim();
              const parsed = JSON.parse(cleaned);
              if (parsed.files && typeof parsed.files === "object") {
                Object.assign(currentFiles, parsed.files);
              }
            } catch {
              // Not valid JSON yet
            }
          }

          const snapshot = accumulated;
          const filesSnapshot = multiFileMode ? { ...currentFiles } : emptyFiles;
          setState({ status: "streaming", code: snapshot, files: filesSnapshot });
        }

        const finalFiles = multiFileMode ? { ...currentFiles } : emptyFiles;
        setState({ status: "done", code: accumulated, files: finalFiles });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred";
        setState({ status: "error", message });
      }
    });
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      await handleGenerate();
    }
  }

  const currentCode =
    state.status === "streaming" || state.status === "done" ? state.code : "";
  const currentFiles = state.status === "streaming" || state.status === "done" ? state.files : {};
  const hasFiles = currentFiles && Object.keys(currentFiles).length > 0;

  return (
    <div className="w-full">
      {/* Mode Toggle */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMultiFileMode(false)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              !multiFileMode
                ? "text-white"
                : "border"
            }`}
            style={{
              background: !multiFileMode ? "var(--ring)" : "transparent",
              borderColor: "var(--border)",
              color: multiFileMode ? "var(--muted-foreground)" : "white",
            }}
          >
            Single Component
          </button>
          <button
            onClick={() => setMultiFileMode(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              multiFileMode
                ? "text-white"
                : "border"
            }`}
            style={{
              background: multiFileMode ? "var(--ring)" : "transparent",
              borderColor: "var(--border)",
              color: multiFileMode ? "white" : "var(--muted-foreground)",
            }}
          >
            Full App (Multi-file)
          </button>
        </div>
        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {multiFileMode
            ? "Generates a complete Next.js app with multiple files"
            : "Generates a single React component"}
        </span>
      </div>

      {/* Example Prompts */}
      <div className="mb-3 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => handleExampleClick(example)}
            className="rounded-full border px-3 py-1 text-xs transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
            style={{
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
              background: "var(--muted)",
            }}
          >
            {example}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="w-full resize-none rounded-xl border px-4 py-3.5 text-sm outline-none transition-shadow focus:ring-2"
          style={{
            borderColor: "var(--border)",
            background: "var(--muted)",
            color: "var(--foreground)",
            minHeight: "7rem",
          }}
          rows={4}
          placeholder={
            multiFileMode
              ? "Describe the full app you want to build… (⌘ + Enter to generate)"
              : "Describe the component you want to build… (⌘ + Enter to generate)"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isWorking}
          aria-label={multiFileMode ? "App description" : "Component description"}
          maxLength={2000}
        />
        <span
          className="absolute bottom-3 right-4 select-none text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {prompt.length}/2000
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={isWorking || !prompt.trim()}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--ring)" }}
        >
          {state.status === "loading" && (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
          )}
          {state.status === "loading"
            ? "Connecting…"
            : state.status === "streaming"
              ? multiFileMode
                ? "Generating App…"
                : "Generating…"
              : multiFileMode
                ? "Generate Full App"
                : "Generate Component"}
        </button>

        {isWorking && (
          <button
            onClick={handleStop}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Stop
          </button>
        )}

        {state.status === "done" && (
          <button
            onClick={() => setState({ status: "idle" })}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
            style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Error Message */}
      {state.status === "error" && (
        <div
          className="mt-4 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "oklch(0.65 0.15 25 / 0.4)",
            background: "oklch(0.65 0.15 25 / 0.08)",
            color: "oklch(0.55 0.18 25)",
          }}
          role="alert"
        >
          <strong>Error: </strong>
          {state.message}
        </div>
      )}

      {/* Display Results */}
      {multiFileMode && hasFiles ? (
        <MultiFileDisplay
          files={currentFiles}
          isStreaming={state.status === "streaming"}
        />
      ) : (
        <CodeDisplay
          code={currentCode}
          isStreaming={state.status === "streaming"}
        />
      )}
    </div>
  );
}
