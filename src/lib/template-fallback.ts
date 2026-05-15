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
    features: ["authentication", "dashboard", "responsive-design", "api-routes", "type-safety"],
    pages: [
      { route: "/", description: "Landing page", components: ["Hero", "Features", "Footer"] },
      { route: "/login", description: "Authentication", components: ["LoginForm"] },
      { route: "/dashboard", description: "Main dashboard", components: ["DashboardLayout", "StatsCards", "ProjectList"] },
      { route: "/settings", description: "User settings", components: ["ProfileForm", "SecuritySettings"] },
    ],
    integrations: ["supabase", "tailwind"],
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
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/globals.css",
    "src/app/loading.tsx",
    "src/app/error.tsx",
    ...outline.pages
      .filter((p) => p.route !== "/")
      .map((p) => `src/app${p.route}/page.tsx`),
    ...components.map((c) => `src/components/${c.name}.tsx`),
    "src/lib/supabase/client.ts",
    "src/lib/supabase/server.ts",
    "src/lib/utils.ts",
    "src/hooks/use-auth.ts",
  ];

  return {
    components,
    schema: "users(id uuid pk, email text, created_at timestamptz); profiles(id uuid pk fk users, display_name text, avatar_url text); projects(id uuid pk, user_id uuid fk users, name text, status text, created_at timestamptz)",
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
    fileCount: spec.fileStructure?.length ?? 0,
  });

  const files: FileMap = {};

  files["src/app/layout.tsx"] = `import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "${spec.name}",
  description: "${(spec.description ?? "").replace(/"/g, '\\"').slice(0, 120)}",
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

  files["src/app/globals.css"] = `@import "tailwindcss";

:root {
  --primary: ${primary};
  --background: ${theme === "dark" ? "#0a0a0a" : "#ffffff"};
  --foreground: ${theme === "dark" ? "#ededed" : "#171717"};
}

@theme {
  --color-primary: var(--primary);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

.bg-background { background-color: var(--background); }
.text-foreground { color: var(--foreground); }
`;

  const featureCards = (spec.features ?? [])
    .slice(0, 6)
    .map(
      (f) => `<div className="rounded-3xl border border-white/5 bg-white/5 p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
            <h3 className="font-black uppercase tracking-tight text-lg">${f}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">Advanced ${f} integration powered by Sovereign Forge.</p>
          </div>`,
    )
    .join("\n          ");

  files["src/app/page.tsx"] = `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-6xl font-black tracking-tighter italic uppercase mb-4">${spec.name}</h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
          ${(spec.description ?? "").slice(0, 160)}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="/login"
            className="rounded-full px-8 py-4 font-black uppercase tracking-widest text-sm text-black transition-transform hover:scale-105"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Initiate System
          </a>
          <a
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/5 px-8 py-4 font-black uppercase tracking-widest text-sm text-white transition-all hover:bg-white/10"
          >
            Access Dashboard
          </a>
        </div>
        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          ${featureCards}
        </section>
      </div>
    </main>
  );
}
`;

  files["src/app/loading.tsx"] = `export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Synchronizing Neural Link...</p>
      </div>
    </div>
  );
}`;

  files["src/lib/utils.ts"] = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`;

  // Keep other files mostly same but adjust paths to src/
  files["src/app/login/page.tsx"] = `"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-black">
      <form onSubmit={handleLogin} className="w-full max-w-md p-12 rounded-[2.5rem] border border-white/10 bg-white/5 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">Neural Sign-In</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Authorize access to ${spec.name}</p>
        </div>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="NEURAL_ID@SOVEREIGN.COM"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm font-mono focus:border-primary outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-4 font-black text-xs uppercase tracking-[0.2em] text-black disabled:opacity-50 transition-transform active:scale-95"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {loading ? "AUTHENTICATING..." : "INITIATE SESSION"}
          </button>
        </div>
      </form>
    </main>
  );
}
`;

  files["src/app/dashboard/page.tsx"] = `export default function DashboardPage() {
  return (
    <main className="p-8 md:p-12 lg:p-16 bg-black min-h-screen space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="text-5xl font-black uppercase tracking-tighter italic">Command Center</h1>
          <p className="text-muted-foreground font-bold italic">System status: NOMINAL | Identity verified</p>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "Neural Load", value: "12%", color: "text-primary" },
          { label: "Active Threads", value: "24", color: "text-blue-400" },
          { label: "Manifestations", value: "0", color: "text-green-400" }
        ].map((stat, i) => (
          <div key={i} className="rounded-[2rem] border border-white/10 bg-white/5 p-8 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
            <p className={\`text-4xl font-black \${stat.color}\`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[2.5rem] border border-white/10 bg-white/5 h-96 flex items-center justify-center border-dashed">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No active projects detected. Initiate manifestation to begin.</p>
      </div>
    </main>
  );
}
`;

  files["src/lib/supabase/client.ts"] = `import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
`;

  files["src/lib/supabase/server.ts"] = `import { createServerClient } from "@supabase/ssr";
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
    .split(/\\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3);
  if (words.length === 0) return "My App";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
