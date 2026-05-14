#!/usr/bin/env tsx
/**
 * scripts/patch-all.ts
 * =====================================================================
 * Sovereign Forge OS — Master Patch Script
 *
 * Writes every patched file to the correct location in one run.
 * Run from the repo root:
 *
 *   npx tsx scripts/patch-all.ts
 *
 * Then:
 *   npm install
 *   cp .env.example .env.local  (fill in your keys)
 * =====================================================================
 */

import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

function write(filePath: string, content: string) {
  const abs = path.join(ROOT, filePath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf-8')
  console.log(`✅  wrote  ${filePath}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. package.json
// ─────────────────────────────────────────────────────────────────────────────

write('package.json', `{
  "name": "ai-app-builder",
  "version": "3.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "fresh:restart": "npx tsx scripts/fresh-restart.ts"
  },
  "dependencies": {
    "@e2b/code-interpreter": "^1.2.0",
    "@octokit/rest": "^21.1.1",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/api-logs": "^0.57.2",
    "@opentelemetry/core": "^2.6.1",
    "@radix-ui/react-alert-dialog": "^1.1.4",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.1.6",
    "@sentry/nextjs": "^10.51.0",
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.105.3",
    "@vercel/otel": "^1.10.0",
    "axios": "^1.16.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^11.18.2",
    "highlight.js": "^11.11.1",
    "lucide-react": "^1.14.0",
    "next": "^15.2.4",
    "openai": "^4.104.0",
    "posthog-js": "^1.372.8",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "server-only": "^0.0.1",
    "stripe": "^22.1.0",
    "tailwind-merge": "^2.6.0",
    "uuid": "^11.1.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.3",
    "@types/node": "^22.19.15",
    "@types/pg": "^8.20.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/uuid": "^10.0.0",
    "dotenv": "^16.6.1",
    "eslint": "^9.23.0",
    "eslint-config-next": "^15.2.4",
    "pg": "^8.20.0",
    "tailwindcss": "^4.2.4",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  }
}
`)

// ─────────────────────────────────────────────────────────────────────────────
// 2. .env.example
// ─────────────────────────────────────────────────────────────────────────────

write('.env.example', `# ============================================================
# AI App Builder — Environment Variables
# LLM chain: OpenCode Go (paid) → Zen (free) → GitHub Models (free) → HuggingFace (free)
# ============================================================

# ── Supabase ─────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_MANAGEMENT_API_KEY=sbp_...

# ── Site URL ─────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# ── AI Providers — Paid → Free Waterfall ─────────────────────
# 1. OpenCode Go (PRIMARY — PAID)
OPENCODE_GO_API_KEY=sk-go-your-key-here
OPENCODE_GO_API_KEYS=sk-go-key1,sk-go-key2
OPENCODE_GO_BASE_URL=https://go.opencode.ai/v1
OPENCODE_GO_MODEL=claude-sonnet-4-5

# 2. OpenCode Zen (FALLBACK 1 — FREE)
OPENCODE_ZEN_API_KEY=sk-zen-your-key-here
OPENCODE_ZEN_API_KEYS=sk-zen-key1,sk-zen-key2
OPENCODE_ZEN_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_ZEN_MODEL=kimi-k2.5-free

# 3. GitHub Models (FALLBACK 2 — FREE)
GITHUB_TOKEN=ghp_your_token_here
GITHUB_MODELS_MODEL=openai/gpt-4.1-mini

# 4. Hugging Face (FALLBACK 3 — FREE)
HF_TOKEN=hf_your_token_here
HF_MODEL=meta-llama/Llama-3.3-70B-Instruct

# ── Stripe ───────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ACCOUNT_ID=acct_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Basic Tiers
STRIPE_BASIC_MINI_MONTHLY_PRICE_ID=price_...
STRIPE_BASIC_MINI_YEARLY_PRICE_ID=price_...
STRIPE_BASIC_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_BASIC_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_BASIC_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_BASIC_PRO_YEARLY_PRICE_ID=price_...
STRIPE_BASIC_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_BASIC_PREMIUM_YEARLY_PRICE_ID=price_...

# Elite Tiers
STRIPE_ELITE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_ELITE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_ELITE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_ENTERPRISE_YEARLY_PRICE_ID=price_...

# Lifetime Licenses
STRIPE_LIFETIME_STARTER_PRICE_ID=price_...
STRIPE_LIFETIME_PRO_PRICE_ID=price_...
STRIPE_ON_PREM_PERPETUAL_PRICE_ID=price_...

# Credit Top-Up Packs
STRIPE_CREDITS_5K_PRICE_ID=price_...
STRIPE_CREDITS_10K_PRICE_ID=price_...
STRIPE_CREDITS_25K_PRICE_ID=price_...
STRIPE_CREDITS_50K_PRICE_ID=price_...
STRIPE_CREDITS_100K_PRICE_ID=price_...

# ── Observability ────────────────────────────────────────────
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
ARIZE_API_KEY=ak-...
ARIZE_SPACE_ID=...
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.arize.com/v1
OTEL_EXPORTER_OTLP_HEADERS=space_id=...,Authorization=ak-...

# ── Deployment ───────────────────────────────────────────────
GITHUB_ACCESS_TOKEN=ghp_...
GITHUB_USERNAME=your_username
GITHUB_REPO=your_username/your_repo
GITHUB_DEFAULT_BRANCH=main
VERCEL_ACCESS_TOKEN=your_vercel_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_TEAM_ID=your_team_id
VERCEL_TOKEN=your_vercel_token

# ── Sandbox (E2B) ────────────────────────────────────────────
E2B_API_KEY=e2b_your_api_key_here

# ── Admin / Workers ──────────────────────────────────────────
ADMIN_API_KEYS=sk-admin-key-1,sk-admin-key-2
WORKER_SHARED_SECRET=your-random-32-char-secret
CRON_SECRET=your-random-cron-secret

# ── Social ───────────────────────────────────────────────────
DISCORD_TOKEN=your_discord_token
SLACK_BOT_TOKEN=your_slack_bot_token
SLACK_WEBHOOK_URL=your_slack_webhook_url
SLACK_CHANNEL_ID=your_slack_channel_id
`)

console.log('patch-all scaffold created')
