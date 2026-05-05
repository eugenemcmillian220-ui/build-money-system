// ─────────────────────────────────────────────────────────────────────────────
// DevGuard AI – GitHub PR Scanner API
// POST /api/scan  – accepts { repo, prNumber, token? }
//                  fetches PR diff from GitHub, runs compliance audit,
//                  persists result to Supabase, returns ComplianceReport
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auditProject, redactPII } from "../../../lib/compliance";
import { createSupabaseAdmin } from "../../../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanRequestBody {
  repo: string;        // e.g. "acme/frontend"
  prNumber: number;
  token?: string;      // GitHub PAT (optional, falls back to GITHUB_TOKEN env)
  projectId?: string;
}

interface GitHubFile {
  filename: string;
  patch?: string;
  status: string;
}

// ─── GitHub Helpers ───────────────────────────────────────────────────────────

async function fetchPRFiles(
  repo: string,
  prNumber: number,
  token: string,
): Promise<GitHubFile[]> {
  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(
      `GitHub API ${res.status}: ${(body.message as string | undefined) ?? res.statusText}`,
    );
  }

  return (await res.json()) as GitHubFile[];
}

// ─── Mock PR for demo when no real token/repo is provided ─────────────────────

function buildMockFiles(): Record<string, string> {
  return {
    "src/utils/mailer.ts": `
// Sending welcome email
const email = "john.doe@example.com";  // PII: email
const ssn   = "123-45-6789";           // PII: SSN
await sendEmail({ to: email, subject: "Welcome!" });
    `,
    "src/api/payments.ts": `
// Stripe payment handler
const card = "4242 4242 4242 4242"; // PII: credit card
const secret = process.env.STRIPE_SECRET_KEY ?? "sk_live_HARDCODED_SECRET";
    `,
    "src/app/layout.tsx": `
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
    `,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Parse & validate body ──────────────────────────────────────────────
    const body = (await req.json()) as ScanRequestBody;
    const { repo, prNumber, projectId = "devguard-demo" } = body;
    const token = body.token ?? process.env.GITHUB_TOKEN ?? "";

    if (!repo || !prNumber) {
      return NextResponse.json(
        { error: "Missing required fields: repo, prNumber" },
        { status: 400 },
      );
    }

    // ── 2. Fetch PR diff (or use mock) ────────────────────────────────────────
    let files: Record<string, string>;

    if (token && repo !== "demo/demo") {
      const prFiles = await fetchPRFiles(repo, prNumber, token);
      files = Object.fromEntries(
        prFiles
          .filter((f) => f.patch)
          .map((f) => [f.filename, f.patch ?? ""]),
      );
      if (Object.keys(files).length === 0) {
        return NextResponse.json({ error: "PR has no diff content" }, { status: 422 });
      }
    } else {
      // Demo mode: use mock PR content
      files = buildMockFiles();
    }

    // ── 3. Run compliance audit ───────────────────────────────────────────────
    const report = await auditProject(projectId, files, prNumber);

    // ── 4. Redact PII from stored content ────────────────────────────────────
    const redactedFiles = Object.fromEntries(
      Object.entries(files).map(([k, v]) => [k, redactPII(v)]),
    );
    void redactedFiles; // available for S3 storage if needed

    // ── 5. Persist to Supabase ────────────────────────────────────────────────
    let scanId: string | undefined;
    try {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase
        .from("scans")
        .insert({
          project_id: projectId,
          pr_number: prNumber,
          pr_url: `https://github.com/${repo}/pull/${prNumber}`,
          repo,
          score: report.score,
          grade: report.grade,
          passed: report.passed,
          pii_count: report.pii.count,
          findings_count: report.findings.length,
          report: report as never,
          healed: false,
          healed_at: null,
        })
        .select("id")
        .single();

      if (!error && data) {
        scanId = (data as { id: string }).id;
      }
    } catch (dbErr) {
      // Non-fatal – scan still returns even if DB is unreachable
      console.warn("[DevGuard] Supabase write failed:", dbErr);
    }

    // ── 6. Return ─────────────────────────────────────────────────────────────
    return NextResponse.json({ scanId, report }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[DevGuard] /api/scan error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
