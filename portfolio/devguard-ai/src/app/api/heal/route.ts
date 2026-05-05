// DA-050 FIX: TODO: Replace admin/service_role client with user-scoped client
// Admin operations should go through a server-side job, not a direct API route
// ─────────────────────────────────────────────────────────────────────────────
// DevGuard AI – SRE Auto-Healing API
// POST /api/heal  – accepts { scanId }
//                  generates remediation patches for each finding,
//                  persists heal_actions to Supabase, returns patch bundle
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../lib/supabase";
import type { ComplianceFinding } from "../../../lib/compliance";

// ─── Patch Templates ──────────────────────────────────────────────────────────

const PATCH_TEMPLATES: Record<
  string,
  { action: string; description: string; patch: string }
> = {
  "SOC2-CC6.1 / GDPR-Art.32": {
    action: "redact_pii",
    description: "Redact detected PII and rotate compromised secrets",
    patch: `
--- a/src/config/secrets.ts
+++ b/src/config/secrets.ts
@@ -1,3 +1,5 @@
-const apiKey = "sk_live_HARDCODED_SECRET";
+// ✅ DevGuard Auto-Heal: Move secret to environment variable
+const apiKey = process.env.API_KEY;
+if (!apiKey) throw new Error("API_KEY env var is required");
 
-const email = "john.doe@example.com"; // PII
+const email = process.env.ADMIN_EMAIL; // PII moved to env
`.trim(),
  },
  "SOC2-CC6.7": {
    action: "add_encryption",
    description: "Add AES-256 encryption wrapper for sensitive data fields",
    patch: `
--- a/src/lib/crypto.ts (NEW FILE)
+++ b/src/lib/crypto.ts
@@ -0,0 +1,20 @@
+// ✅ DevGuard Auto-Heal: Encryption helpers
+import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
+const ALGORITHM = "aes-256-gcm";
+const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
+
+export function encrypt(plaintext: string): string {
+  const iv  = randomBytes(16);
+  const cipher = createCipheriv(ALGORITHM, KEY, iv);
+  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
+  return iv.toString("hex") + ":" + enc.toString("hex");
+}
+
+export function decrypt(ciphertext: string): string {
+  const [ivHex, encHex] = ciphertext.split(":");
+  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
+  const dec = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
+  return dec.toString("utf8");
+}
`.trim(),
  },
  "SOC2-CC6.2": {
    action: "add_rls",
    description: "Enable Row Level Security on all Supabase tables",
    patch: `
--- a/supabase/migrations/20260101_rls.sql (NEW FILE)
+++ b/supabase/migrations/20260101_rls.sql
@@ -0,0 +1,15 @@
+-- ✅ DevGuard Auto-Heal: Enable RLS
+ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
+ALTER TABLE audit_events  ENABLE ROW LEVEL SECURITY;
+ALTER TABLE pii_records   ENABLE ROW LEVEL SECURITY;
+
+CREATE POLICY "Users own their data"
+  ON users FOR ALL USING (auth.uid() = id);
+
+CREATE POLICY "Audit events visible to owner"
+  ON audit_events FOR SELECT USING (auth.uid() = user_id);
+
+CREATE POLICY "PII records restricted"
+  ON pii_records FOR ALL USING (auth.uid() = owner_id);
`.trim(),
  },
  "SOC2-CC7.2": {
    action: "add_audit_log",
    description: "Add structured audit logging middleware",
    patch: `
--- a/src/middleware.ts
+++ b/src/middleware.ts
@@ -1,4 +1,18 @@
+// ✅ DevGuard Auto-Heal: Audit logging middleware
 import { NextRequest, NextResponse } from "next/server";
+import pino from "pino";
+
+const logger = pino({ level: "info" });
+
 export function middleware(req: NextRequest) {
+  logger.info({
+    method: req.method,
+    path: req.nextUrl.pathname,
+    ip: req.headers.get("x-forwarded-for") ?? "unknown",
+    ua: req.headers.get("user-agent"),
+    ts: new Date().toISOString(),
+  });
   return NextResponse.next();
 }
`.trim(),
  },
  "GDPR-Art.13": {
    action: "add_gdpr_route",
    description: "Scaffold /privacy-policy route and consent banner",
    patch: `
--- a/src/app/privacy-policy/page.tsx (NEW FILE)
+++ b/src/app/privacy-policy/page.tsx
@@ -0,0 +1,10 @@
+// ✅ DevGuard Auto-Heal: Privacy Policy page
+export default function PrivacyPolicy() {
+  return (
+    <main className="prose mx-auto p-8">
+      <h1>Privacy Policy</h1>
+      <p>Last updated: {new Date().toLocaleDateString()}</p>
+      <p>We process your data under GDPR Art. 13 lawful basis...</p>
+    </main>
+  );
+}
`.trim(),
  },
  "GDPR-Art.17": {
    action: "add_gdpr_route",
    description: "Add DELETE /api/user endpoint for right-to-erasure",
    patch: `
--- a/src/app/api/user/route.ts (NEW FILE)
+++ b/src/app/api/user/route.ts
@@ -0,0 +1,18 @@
+// ✅ DevGuard Auto-Heal: GDPR right-to-erasure endpoint
+import { createSupabaseServerClient } from "@/lib/supabase";
+import { NextResponse } from "next/server";
+
+export async function DELETE() {
+  const supabase = await createSupabaseServerClient();
+  const { data: { user } } = await supabase.auth.getUser();
+  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
+
+  await supabase.from("users").delete().eq("id", user.id);
+  await supabase.auth.admin.deleteUser(user.id);
+  return NextResponse.json({ deleted: true });
+}
`.trim(),
  },
};

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { scanId } = (await req.json()) as { scanId: string };

    if (!scanId) {
      return NextResponse.json({ error: "Missing scanId" }, { status: 400 });
    }

    // ── 1. Fetch scan record ──────────────────────────────────────────────────
    const supabase = createSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scan, error: scanErr } = await (supabase as any)
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .single();

    if (scanErr || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    const report = scan.report as { findings: ComplianceFinding[] };
    const findings: ComplianceFinding[] = report.findings ?? [];

    // ── 2. Generate heal actions for each finding ─────────────────────────────
    const healActions = findings.map((finding) => {
      const template = PATCH_TEMPLATES[finding.rule] ?? {
        action: "redact_pii" as const,
        description: `Generic fix for ${finding.rule}`,
        patch: `# Auto-generated remediation for ${finding.rule}\n# Manual review required`,
      };

      return {
        scan_id: scanId,
        action_type: template.action as
          | "redact_pii"
          | "add_rls"
          | "add_encryption"
          | "add_audit_log"
          | "add_gdpr_route",
        description: `[${finding.id}] ${template.description}`,
        patch_preview: template.patch,
        applied: false,
      };
    });

    // ── 3. Persist heal actions ───────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedActions, error: insertErr } = await (supabase as any)
      .from("heal_actions")
      .insert(healActions)
      .select();

    if (insertErr) {
      console.warn("[DevGuard] Failed to insert heal actions:", insertErr);
    }

    // ── 4. Mark scan as healed ────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("scans")
      .update({ healed: true, healed_at: new Date().toISOString() })
      .eq("id", scanId);

    // ── 5. Simulate SRE healing delay (production would open a GitHub PR) ─────
    await new Promise((r) => setTimeout(r, 200));

    return NextResponse.json(
      {
        message: `✅ SRE Healing complete — ${healActions.length} patches generated`,
        healActions: insertedActions ?? healActions,
        patchCount: healActions.length,
        estimatedFixTime: `${healActions.length * 2} minutes`,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[DevGuard] /api/heal error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
