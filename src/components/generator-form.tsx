"use client";

import { useRef, useState, useTransition } from "react";
import { CodeDisplay } from "@/components/code-display";

type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "streaming"; code: string }
  | { status: "done"; code: string }
  | { status: "error"; message: string };

const EXAMPLE_PROMPTS = [
  "Landing page for a fitness app",
  "Dashboard with analytics cards and charts",
  "Pricing table with three tiers",
  "Contact form with validation",
  "E-commerce product card grid",
];

export function GeneratorForm() {
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<GenerationState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isWorking = state.status === "loading" || state.status === "streaming" || isPending;

  function handleExampleClick(example: string) {
    setPrompt(example);
    textareaRef.current?.focus();
  }

  function handleStop() {
    abortRef.current?.abort();
    setState((prev) =>
      prev.status === "streaming"
        ? { status: "done", code: prev.code }
        : { status: "idle" },
    );
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed || isWorking) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ status: "loading" });

    startTransition(async () => {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, stream: true }),
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

        setState({ status: "streaming", code: "" });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setState({ status: "streaming", code: snapshot });
        }

        setState({ status: "done", code: accumulated });
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

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLE_PROMPTS.map((example) => (
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
          placeholder="Describe the component you want to build… (⌘ + Enter to generate)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isWorking}
          aria-label="Component description"
          maxLength={2000}
        />
        <span
          className="absolute bottom-3 right-4 select-none text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          {prompt.length}/2000
        </span>
      </div>

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
              ? "Generating…"
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

      <CodeDisplay
        code={currentCode}
        isStreaming={state.status === "streaming"}
      />
    </div>
  );
}
