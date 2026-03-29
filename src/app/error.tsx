"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div
        className="w-full max-w-md rounded-xl border p-8 text-center"
        style={{ borderColor: "var(--border)", background: "var(--muted)" }}
      >
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
        <p className="mb-6 text-sm" style={{ color: "var(--muted-foreground)" }}>
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="mb-6 font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2"
          style={{ background: "var(--ring)" }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
