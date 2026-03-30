import type { Metadata } from "next";
import { GeneratorForm } from "@/components/generator-form";

export const metadata: Metadata = {
  title: "AI App Builder - Phase 2",
  description:
    "Generate production-ready Next.js apps with multi-file support and live preview",
};

export default function HomePage() {
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
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
          Phase 2 - Multi-file Generation + Live Preview
        </div>

        <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">
          AI App Builder
        </h1>
        <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
          Describe a component or full app and get production-ready Next.js + Tailwind code instantly.
        </p>
      </header>

      <GeneratorForm />

      <section className="mt-16 grid gap-8 sm:grid-cols-3">
        <div className="rounded-xl border p-6" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
          <div className="mb-3 text-2xl">⚛️</div>
          <h3 className="mb-2 font-semibold">Single Component</h3>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Generate a single React component with Tailwind CSS styling. Perfect for quick UI components.
          </p>
        </div>
        <div className="rounded-xl border p-6" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
          <div className="mb-3 text-2xl">📁</div>
          <h3 className="mb-2 font-semibold">Multi-file Apps</h3>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Generate complete Next.js apps with multiple files including pages, components, and styles.
          </p>
        </div>
        <div className="rounded-xl border p-6" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
          <div className="mb-3 text-2xl">👁️</div>
          <h3 className="mb-2 font-semibold">Live Preview</h3>
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            Preview your generated components in real-time with our interactive live preview system.
          </p>
        </div>
      </section>

      <footer className="mt-16 border-t pt-8 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
        <p>
          Built with Next.js 15 · React 19 · Tailwind CSS v4 · OpenRouter · react-live
        </p>
      </footer>
    </main>
  );
}
