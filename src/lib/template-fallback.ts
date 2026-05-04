import { FileMap, AppSpec } from "./types";
import { logger } from "./logger";
import type { AppSpecOutline, AppSpecDetails } from "./llm";

/**
 * Deterministic / template-based fallback generators.
 *
 * When the LLM-backed generators fail after exhausting retries, these
 * functions produce a valid-but-minimal Next.js 15 skeleton so the
 * pipeline can still persist a project rather than leaving the user
 * with an opaque "generation stuck" error.
 *
 * The generated code compiles, renders, and includes Supabase Auth
 * scaffolding so the user has a working starting point they can iterate on.
 */

export function fallbackOutline(prompt: string): AppSpecOutline {
  const name = extractAppName(prompt);
  logger.warn("Using fallback outline generator", { prompt: prompt.slice(0, 120), name });

  return {
    name,
    description: `A Next.js application based on: ${prompt.slice(0, 80)}`,
    features: ["authentication", "dashboard", "responsive-design"],
    pages: [
      { route: "/", description: "Landing page", components: ["Hero", "Features"] },
      { route: "/login", description: "Authentication", components: ["LoginForm"] },
      { route: "/dashboard", description: "Main dashboard", components: ["DashboardLayout", "StatsCards"] },
    ],
    integrations: ["supabase"],
    visuals: { theme: "dark", primaryColor: "#f59e0b" },
  };
}

export function fallbackDetails(outline: AppSpecOutline): AppSpecDetails {
  logger.warn("Using fallback details generator", { name: outline.name });

  const components = outline.pages.flatMap((page) =>
    page.components.map((c) => ({
      name: c,
      description: `Component for ${page.route}`,
      props: {} as Record<string, string>,
    })),
  );

  const fileStructure = [
    "app/layout.tsx",
    "app/page.tsx",
    "app/globals.css",
    ...outline.pages
      .filter((p) => p.route !== "/")
      .map((p) => `app${p.route}/page.tsx`),
    ...components.map((c) => `components/${c.name}.tsx`),
    "lib/supabase/client.ts",
    "lib/supabase/server.ts",
  ];

  return {
    components,
    schema: "users(id uuid pk, email text, created_at timestamptz); profiles(id uuid pk fk users, display_name text)",
    fileStructure,
  };
}

export function fallbackSpec(prompt: string): AppSpec {
  const outline = fallbackOutline(prompt);
  const details = fallbackDetails(outline);
  return { ...outline, ...details };
}

/**
 * Generates a complete, compilable Next.js 15 skeleton file map.
 * This is the last-resort fallback when LLM code generation fails.
 */
export function fallbackFileMap(spec: AppSpec): FileMap {
  const theme = spec.visuals?.theme ?? "dark";
  const primary = spec.visuals?.primaryColor ?? "#f59e0b";

  logger.warn("Using fallback file-map generator", {
    name: spec.name,
    fileCount: spec.fileStructure.length,
  });

  const files: FileMap = {};

  files["app/layout.tsx"] = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${spec.name}",
  description: "${spec.description.replace(/"/g, '\\"').slice(0, 120)}",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="${theme}">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
`;

  files["app/globals.css"] = `@import "tailwindcss";

:root {
  --primary: ${primary};
  --background: ${theme === "dark" ? "#0a0a0a" : "#ffffff"};
  --foreground: ${theme === "dark" ? "#ededed" : "#171717"};
}

.bg-background { background-color: var(--background); }
.text-foreground { color: var(--foreground); }
`;

  files["app/page.tsx"] = `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">${spec.name}</h1>
      <p className="text-lg text-gray-400 mb-8 max-w-md text-center">
        ${spec.description.slice(0, 160)}
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="rounded-lg px-6 py-3 font-medium text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Get Started
        </a>
        <a
          href="/dashboard"
          className="rounded-lg border border-gray-700 px-6 py-3 font-medium"
        >
          Dashboard
        </a>
      </div>
      <section className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        ${spec.features
          .slice(0, 6)
          .map(
            (f) => `<div className="rounded-xl border border-gray-800 p-6">
          <h3 className="font-semibold mb-2">${f}</h3>
          <p className="text-sm text-gray-500">Built-in ${f} support.</p>
        </div>`,
          )
          .join("\n        ")}
      </section>
    </main>
  );
}
`;

  files["app/login/page.tsx"] = `"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: integrate Supabase auth
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <h2 className="text-2xl font-bold text-center">Sign In</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg py-2 font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </main>
  );
}
`;

  files["app/dashboard/page.tsx"] = `export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-800 p-6">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-3xl font-bold mt-1">0</p>
        </div>
        <div className="rounded-xl border border-gray-800 p-6">
          <p className="text-sm text-gray-500">Active Projects</p>
          <p className="text-3xl font-bold mt-1">0</p>
        </div>
        <div className="rounded-xl border border-gray-800 p-6">
          <p className="text-sm text-gray-500">Revenue</p>
          <p className="text-3xl font-bold mt-1">$0</p>
        </div>
      </div>
    </main>
  );
}
`;

  files["lib/supabase/client.ts"] = `import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
`;

  files["lib/supabase/server.ts"] = `import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
`;

  return files;
}

function extractAppName(prompt: string): string {
  const words = prompt
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3);
  if (words.length === 0) return "My App";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
