import type { Metadata } from "next";
import { GeneratorForm } from "@/components/generator-form";

export const metadata: Metadata = {
  title: "AI App Builder",
};

export default function HomePage() {
  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
          style={{
            borderColor: "var(--ring)",
            color: "var(--ring)",
            background: "oklch(0.58 0.2 264 / 0.08)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "var(--ring)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--ring)" }} />
          </span>
          Powered by GPT-4o mini via OpenRouter
        </div>

        <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
          AI App Builder
        </h1>
        <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
          Describe a component and get production-ready Next.js + Tailwind code instantly.
        </p>
      </header>

      <GeneratorForm />

      <footer className="mt-16 border-t pt-8 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
        <p>
          Built with Next.js 15 · React 19 · Tailwind CSS v4 · OpenRouter
        </p>
      </footer>
    </main>
  );
}
