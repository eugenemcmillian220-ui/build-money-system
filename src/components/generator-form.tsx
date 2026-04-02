"use client";

import { useRef, useState, useTransition } from "react";
import { CodeDisplay } from "@/components/code-display";
import { MultiFileDisplay } from "@/components/multi-file-display";

type FileMap = Record<string, string>;

type GenerationState =
  | { status: "idle" }
  | { status: "loading"; code: string; files: FileMap }
  | { status: "streaming"; code: string; files: FileMap }
  | { status: "done"; code: string; files: FileMap }
  | { status: "error"; message: string };

const EXAMPLE_PROMPTS = [
  "Modern Landing Page for a Fitness SaaS",
  "Analytics Dashboard with real-time charts",
  "Advanced E-commerce Checkout with Stripe",
  "Contact Form with Zod validation",
];

const MULTI_FILE_EXAMPLES = [
  "Full SaaS platform with Dashboard, Billing, and Landing Page",
  "Multi-user blog platform with Supabase integration",
  "AI Chat application with history and search",
  "Portfolio site with CMS and Project Grid",
];

/**
 * Attempt to extract files from a partial JSON string as the LLM streams it.
 */
function tryExtractFiles(jsonBuffer: string): FileMap {
  const files: FileMap = {};
  const filesStart = jsonBuffer.indexOf('"files"');
  if (filesStart === -1) return files;

  const objectStart = jsonBuffer.indexOf("{", filesStart + 7);
  if (objectStart === -1) return files;

  const keyPattern = /"([^"\\](?:[^"\\]|\\.)*)"\s*:\s*"/g;
  keyPattern.lastIndex = objectStart + 1;

  let match: RegExpExecArray | null;
  while ((match = keyPattern.exec(jsonBuffer)) !== null) {
    const key = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const valueStart = keyPattern.lastIndex;

    let valueEnd = -1;
    let i = valueStart;
    let escaped = false;
    while (i < jsonBuffer.length) {
      const ch = jsonBuffer[i];
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        valueEnd = i;
        break;
      }
      i++;
    }

    if (valueEnd !== -1) {
      const rawValue = jsonBuffer.slice(valueStart, valueEnd);
      const value = rawValue
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      if (
        key &&
        value.length > 0 &&
        (key.startsWith("app/") || key.startsWith("components/") || key.startsWith("lib/") || key.startsWith("supabase/"))
      ) {
        files[key] = value;
      }

      keyPattern.lastIndex = valueEnd + 1;
    } else {
      break;
    }
  }

  return files;
}

export function GeneratorForm() {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<GenerationState>({ status: "idle" });
  const [mode, setMode] = useState<"web-component" | "web-app" | "mobile-app" | "vision">("web-app");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isWorking = state.status === "loading" || state.status === "streaming" || isPending;
  const examples = mode === "web-app" ? MULTI_FILE_EXAMPLES : EXAMPLE_PROMPTS;

  function handleExampleClick(example: string) {
    setPrompt(example);
    textareaRef.current?.focus();
  }

  function handleStop() {
    abortRef.current?.abort();
    if (state.status === "streaming") {
      setState({ status: "done", code: state.code, files: state.files });
    } else {
      setState({ status: "idle" });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string);
      setMode("vision");
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if ((!trimmed && !imageUrl) || isWorking) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "loading", code: "", files: {} });

    startTransition(async () => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: trimmed,
            imageUrl: mode === "vision" ? imageUrl : undefined,
            stream: true,
            multiFile: mode !== "web-component",
            mode: mode,
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

        setState({ status: "streaming", code: "", files: {} });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let rawCode = "";
        let currentFiles: FileMap = {};
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });

          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            let event: { type: string; delta?: string; result?: { files: FileMap; description?: string }; error?: string };
            try {
              event = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (event.type === "chunk" && typeof event.delta === "string") {
              rawCode += event.delta;

              if (mode !== "web-component") {
                const partial = tryExtractFiles(rawCode);
                if (Object.keys(partial).length > 0) {
                  currentFiles = partial;
                }
              }

              setState({ status: "streaming", code: rawCode, files: { ...currentFiles } });
            } else if (event.type === "result" && event.result) {
              currentFiles = event.result.files ?? currentFiles;
              setState({ status: "done", code: rawCode, files: { ...currentFiles } });
            } else if (event.type === "error") {
              setState({ status: "error", message: event.error ?? "Generation failed" });
              return;
            }
          }
        }

        if (state.status !== "done" && state.status !== "error") {
          setState((prev) =>
            prev.status === "streaming"
              ? { status: "done", code: prev.code, files: prev.files }
              : prev
          );
        }
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
    <div className="w-full space-y-8">
      {/* Mode Toggle */}
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="glass-card flex items-center rounded-2xl p-1.5">
          {[
            { id: "web-component", label: "Single Unit" },
            { id: "web-app", label: "Web Suite" },
            { id: "mobile-app", label: "Mobile App" },
            { id: "vision", label: "Vision-to-Code" }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as "web-component" | "web-app" | "mobile-app" | "vision")}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold tracking-tight transition-all ${
                mode === m.id
                  ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {mode === "vision"
            ? "Autonomous Vision-to-Code Pipeline"
            : mode === "mobile-app"
            ? "Elite Expo/React Native Pipeline"
            : mode === "web-app"
            ? "Elite Full-Stack Pipeline Active"
            : "Precision Component Generation Active"}
        </span>
      </div>

      {/* Vision Upload Area */}
      {mode === "vision" && (
        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {!imageUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-brand-500/50 hover:bg-white/10"
            >
              <span className="text-3xl mb-2">📸</span>
              <span className="text-sm font-bold text-muted-foreground">Upload Screenshot or Design</span>
            </button>
          ) : (
            <div className="group relative h-48 w-full overflow-hidden rounded-2xl border border-white/10">
              <img src={imageUrl} alt="Design reference" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setImageUrl(null)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white"
                >
                  REMOVE IMAGE
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Input Area */}
      <div className="group relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-brand-500/20 to-accent/20 blur opacity-75 transition-all group-focus-within:opacity-100" />
        <textarea
          ref={textareaRef}
          className="relative w-full resize-none rounded-xl border border-white/10 bg-black/40 px-6 py-5 text-base text-white outline-none backdrop-blur-xl transition-all placeholder:text-muted-foreground/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
          style={{ minHeight: "10rem" }}
          rows={5}
          placeholder={
            mode === "web-app"
              ? "What enterprise application shall we manifest today?"
              : mode === "mobile-app"
              ? "Describe the mobile application to build with Expo..."
              : "Describe the atomic component you require…"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isWorking}
          maxLength={2000}
        />
        <div className="absolute bottom-4 right-6 text-xs font-bold tracking-widest text-muted-foreground/50">
          {prompt.length}/2000
        </div>
      </div>

      {/* Example Prompts */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => handleExampleClick(example)}
            className="rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-300"
          >
            {example}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <button
          onClick={handleGenerate}
          disabled={isWorking || !prompt.trim()}
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-brand-500 px-8 py-4 text-sm font-black text-white shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-400 to-brand-600 opacity-0 transition-opacity group-hover:opacity-100" />
          {state.status === "loading" && (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {state.status === "loading"
            ? "Establishing Neural Link…"
            : state.status === "streaming"
              ? mode === "mobile-app"
                ? "Manifesting Mobile Suite…"
                : "Manifesting Suite…"
              : mode === "web-app"
                ? "GENERATE FULL SUITE"
                : mode === "mobile-app"
                ? "GENERATE MOBILE APP"
                : "GENERATE COMPONENT"}
        </button>

        {isWorking && (
          <button
            onClick={handleStop}
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-95"
          >
            TERMINATE
          </button>
        )}

        {state.status === "done" && (
          <button
            onClick={() => setState({ status: "idle" })}
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-bold text-white transition-all hover:bg-white/10"
          >
            RESET
          </button>
        )}
      </div>

      {/* Error Message */}
      {state.status === "error" && (
        <div
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-bold text-red-400 backdrop-blur-xl"
          role="alert"
        >
          <span className="mr-2 text-lg">⚠️</span> {state.message}
        </div>
      )}

      {/* Display Results */}
      <div className="mt-12 overflow-hidden rounded-2xl border border-white/5 bg-black/20 shadow-inner">
        {mode !== "web-component" && hasFiles ? (
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
    </div>
  );
}
