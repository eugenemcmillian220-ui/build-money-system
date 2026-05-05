// ─────────────────────────────────────────────────────────────────────────────
// DevGuard AI – Supabase Client + Type Definitions
// Uses @supabase/ssr for Next.js 15 App Router compatibility
// ─────────────────────────────────────────────────────────────────────────────

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { ComplianceReport } from "./compliance";

// ─── Database Schema Types ────────────────────────────────────────────────────

export interface ScanRecord {
  id: string;
  created_at: string;
  project_id: string;
  pr_number: number | null;
  pr_url: string | null;
  repo: string | null;
  score: number;
  grade: string;
  passed: boolean;
  pii_count: number;
  findings_count: number;
  report: ComplianceReport;
  healed: boolean;
  healed_at: string | null;
}

export interface HealAction {
  id: string;
  created_at: string;
  scan_id: string;
  action_type: "redact_pii" | "add_rls" | "add_encryption" | "add_audit_log" | "add_gdpr_route";
  description: string;
  patch_preview: string;
  applied: boolean;
}

export type Database = {
  public: {
    Tables: {
      scans: {
        Row: ScanRecord;
        Insert: Omit<ScanRecord, "id" | "created_at">;
        Update: Partial<Omit<ScanRecord, "id">>;
      };
      heal_actions: {
        Row: HealAction;
        Insert: Omit<HealAction, "id" | "created_at">;
        Update: Partial<Omit<HealAction, "id">>;
      };
    };
  };
};

// ─── Server-Side Client (App Router) ─────────────────────────────────────────

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies – middleware handles refresh
          }
        },
      },
    },
  );
}

// ─── Service-Role Client (API Routes / admin operations) ──────────────────────

export function createSupabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required for admin operations");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

// suppress unused import warning
void (null as unknown as CookieMethodsServer);

// ─── SQL Migration (run via Supabase CLI or dashboard) ───────────────────────
//
// CREATE TABLE scans (
//   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
//   project_id  TEXT NOT NULL,
//   pr_number   INT,
//   pr_url      TEXT,
//   repo        TEXT,
//   score       INT NOT NULL,
//   grade       TEXT NOT NULL,
//   passed      BOOLEAN NOT NULL,
//   pii_count   INT NOT NULL DEFAULT 0,
//   findings_count INT NOT NULL DEFAULT 0,
//   report      JSONB NOT NULL,
//   healed      BOOLEAN NOT NULL DEFAULT false,
//   healed_at   TIMESTAMPTZ
// );
//
// CREATE TABLE heal_actions (
//   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
//   scan_id      UUID REFERENCES scans(id) ON DELETE CASCADE,
//   action_type  TEXT NOT NULL,
//   description  TEXT NOT NULL,
//   patch_preview TEXT NOT NULL,
//   applied      BOOLEAN NOT NULL DEFAULT false
// );
//
// -- RLS policies
// ALTER TABLE scans        ENABLE ROW LEVEL SECURITY;
// ALTER TABLE heal_actions ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "Service role full access - scans"
//   ON scans FOR ALL TO service_role USING (true) WITH CHECK (true);
// CREATE POLICY "Service role full access - heal"
//   ON heal_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
// CREATE POLICY "Anon read scans"
//   ON scans FOR SELECT TO anon USING (true);
