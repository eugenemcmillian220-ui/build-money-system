# 🧠 CODEBASE.md — Build Money System
> **Canonical AI Context File** — Read this before making changes.
> Last updated: 2026-04-10 | Phase 20 Active | Unified Dashboard Restored | Expansion v2.2 Active

---

## 🏗️ What This Is
**Build Money System** is a 20-phase autonomous AI SaaS empire engine.
**Expansion v2.3 (Elite Empire) Enhancements:**
- **Sovereign Agent Swarm (Ph 1-20)**: 17 specialized agents for R&D, security, M&A, legal, and meta-management.
- **Economic Intelligence**: Agent ROI tracking, Surge Pricing, and Staking/RevShare infrastructure.
- **Autonomous Lifecycle**: Real-time UI refinement (Sculptor), self-healing error diagnosis (Healer), and design-to-code (Figma).
- **IP & Compliance**: Autonomous patent drafting and custom legal vault generation.
- **Production**: https://build-money-system.vercel.app
- **GitHub**: https://github.com/eugenemcmillian220-ui/build-money-system
- **Supabase Project**: `rgvjijiafpimfqbbyqtt` (ACTIVE_HEALTHY)
- **Stripe Account**: `acct_1TIsThIYSZ7ijCe4` (sandbox/test mode)

---

## 📦 Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe (Checkout, Webhooks, Subscriptions) |
| AI / LLM | Multi-provider rotation: Groq, Gemini, OpenRouter, OpenAI |
| Observability | Arize AI (OTel via @vercel/otel) + Sentry |
| Analytics | PostHog |
| Deployment | Vercel (project: `prj_IWU7CvE5WyYuKCaEqxRwPY2H00Xn`) |
| Styling | Tailwind CSS v4 + shadcn/ui patterns |

---

## 🗂️ Canonical Source Structure

```
src/
  app/
    api/                   ← All API routes (55+ endpoints)
      billing/
        checkout/          ← POST: creates Stripe checkout sessions
        webhook/           ← POST: handles Stripe webhook events
      generate/            ← Phase 1-3: core AI code generation
      manifest/            ← Phase 19-20: full agent pipeline (Scout→Dev→Chronicler→Herald→Phantom)
      projects/            ← CRUD for projects (use this, NOT /api/project/)
      health/              ← GET: platform health check
    auth/callback/         ← Supabase OAuth callback handler
    dashboard/             ← Main authenticated app shell (Unified with Sidebar)
      terminal/            ← Neural Terminal sub-page
      projects/            ← Manifested Empires management
      billing/             ← Empire Economy & Pricing
      governance/          ← Audit logs & IP Vault
    login/ signup/         ← Auth pages
  components/
    dashboard/             ← Sidebar, ProjectList, AiTerminal, SystemStatus
    billing/
      pricing-table.tsx    ← THE canonical pricing UI (uses BILLING_TIERS from stripe.ts)
    marketplace/           ← Skill cards and category filters
  lib/
    stripe.ts              ← ✅ CANONICAL: BILLING_TIERS, LIFETIME_LICENSES, CREDIT_PACKS, StripeService
    billing-engine.ts      ← Webhook-side billing logic (credit grants on payment events)
    economy.ts             ← AgentEconomy: credit balance, transactions, agent hiring
    llm.ts                 ← callLLM(), planSpec(), buildFromSpec() — instrumented with Arize OTel
    llm-router.ts          ← LLMRouter: provider rotation (Groq→Gemini→OpenRouter→OpenAI)
    key-manager.ts         ← Multi-key rotation pool management
    telemetry.ts           ← Arize AI / OTel span wrapper (startSpan, traced)
    types.ts               ← Shared TypeScript types (Project, FileMap, AppSpec, etc.)
    github.ts              ← GitHub API: create repos, commit files, open PRs
    deploy.ts              ← Vercel API: create deployments
    supabase/
      client.ts            ← Browser Supabase client
      server.ts            ← Server-side Supabase client (SSR-safe)
      db.ts                ← supabaseAdmin (service role), project CRUD helpers
    agents/                ← Phase 20 Sovereign Agents
      classifier.ts        ← Classifies prompt intent → mode + protocol
      scout.ts             ← Pre-generation research agent (The Scout)
      chronicler.ts        ← Post-generation doc writer (The Chronicler)
      herald.ts            ← Autonomous launch/marketing agent (The Herald)
      phantom.ts           ← AI UX simulation agent (The Phantom)
    prompts/
      phase-19.ts          ← PHASE_19_SYSTEM_PROMPT, ManifestMode type

scripts/                   ← Operational one-time scripts (not production code)
  setup-stripe.ts          ← Stripe product/price setup
  sync-all-env.ts          ← Push env vars to Vercel
  inject-placeholders.ts   ← Inject Stripe price IDs to Vercel
  deploy-platform.ts       ← Full platform deployment runner
  sync-stripe-vercel.ts    ← Sync Stripe IDs → Vercel env vars

supabase/
  schema.sql               ← Canonical DB schema (organizations, projects, agent_ledger, etc.)

_archive/                  ← ⚠️ IGNORED — old code snapshots, do not import from here
```

---

## 💳 Billing Architecture

### Subscription Plans (`src/lib/stripe.ts`)
| Category | Plans | Phase Access |
|---|---|---|
| Basic | Mini ($5), Starter ($19), Pro ($49), Premium ($99) | Phases 1-3 |
| Elite | Starter ($99), Pro ($249), Enterprise ($999) | Phases 1-17 |
| Lifetime | Starter ($790), Pro ($2390), On-Prem ($4999) | One-time |
| Credits | 5k/10k/25k/50k/100k packs | Top-up |

### Stripe Redirect Flow
1. User clicks "Subscribe Now" → `POST /api/billing/checkout`
2. Server creates Stripe Checkout session (price ID from env vars)
3. Browser redirects to `https://checkout.stripe.com/...`
4. After payment → redirected to **`/dashboard?success=true`**
5. Webhook `POST /api/billing/webhook` grants credits via `billing-engine.ts`

---

## 🤖 Agent Swarm (Phase 1-20)
| Agent | Mission | Phase |
|---|---|---|
| **Classifier** | Intent dispatch & stack selector | 19 |
| **Scout** | Pre-generation technical R&D | 18 |
| **Developer** | Codebase generation & SQL Forge | 1-3 |
| **Sentinel** | Auto Pen-Testing & Hardening | 4 |
| **Chronicler** | Architecture & API documentation | 20 |
| **Security** | Deep vulnerability audit | 8-10 |
| **Phantom** | UX simulation & smoke testing | 20 |
| **Herald** | Marketing & Viral Hype Engine | 11/20 |
| **Economy** | ROI Auditor & Staking Engine | 10/13 |
| **Broker** | B2B Diplomacy & M&A Broker | 14/16 |
| **Legal** | IP Vault & Compliance Specialist | 17 |
| **CEO** | Portfolio Meta-Management | 20 |
| **Sculptor** | Real-time UI Refinement | 1 |
| **Healer** | Self-Healing Error Diagnosis | 7 |
| **Interpreter** | Voice transcript translation | 19 |
| **Hive Mind** | Collective intelligence synthesis | 15 |

### Manifestation Pipeline (`/api/manifest`)
```
POST /api/manifest
  → Classifier
  → Scout
  → Developer (+ SQL Forge + Loops)
  → Sentinel (Hardening)
  → Chronicler
  → Security Auditor
  → Phantom (UX Score)
  → Herald (Marketing + Hype)
  → Economy Auditor (ROI + Staking)
  → Empire Broker (M&A + Negotiation)
  → Legal Vault (IP Drafts)
  → saveProjectDB()
```
Each step is OTel instrumented and visible in Arize AI.

---

## 🔑 Environment Variables (canonical set)
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rgvjijiafpimfqbbyqtt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_51TIsThIYSZ7ijCe4...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=https://build-money-system.vercel.app

# LLM Keys (multi-key rotation pools)
GROQ_KEYS=gsk_...,gsk_...
GEMINI_KEYS=AIza...,AIza...
OPENROUTER_KEYS=sk-or-v1-...,sk-or-v1-...
OPENAI_KEYS=sk-proj-...,sk-proj-...

# Arize AI (OTel)
ARIZE_SPACE_ID=U3BhY2U6NDIwNTM6c2kyQw==
ARIZE_API_KEY=ak-af963d5e-...
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.arize.com/v1

# Deployment
VERCEL_TOKEN=vcp_...
GITHUB_TOKEN=ghp_...
```

---

## ⚠️ Known Constraints
- `/api/project/[id]` is **removed** — use `/api/projects/[id]`
- All LLM calls go through `callLLM()` in `llm.ts` — do not call providers directly
- OTel tracing is initialized in `src/instrumentation.ts` (server-side only)
- `_archive/` is `.gitignore`d — nothing in there is production code

### **Sovereign Health & Repair Protocol**
To maintain and repair the empire, use the following built-in systems:

1.  **System Audit**: Type `status` in the **AI Terminal**. This triggers a live health check of Supabase, Stripe, and the AI Agent Swarm.
2.  **Account Repair**: If your dashboard appears empty or desynced, the system automatically runs the `repairOrganization` logic upon landing on the `/dashboard` page.
3.  **Code Hardening**: Every manifestation is automatically passed through **The Sentinel** (Phase 4) to harden the codebase and fix vulnerabilities before deployment.
4.  **Error Diagnosis**: If a runtime error occurs, **The Healer** agent (Phase 7) diagnoses the logs and suggests an autonomous fix via the `/api/heal` endpoint.
5.  **Schema Alignment**: Use **The SQL Forge** (Phase 2) to regenerate and apply migrations if the database schema drifts from the manifestation intent.
```bash
# Sync env vars to Vercel
npx tsx scripts/sync-all-env.ts

# Deploy via GitHub (CI/CD auto-triggers on push to main)
git push origin main

# Manual deployment trigger
npx tsx scripts/deploy-platform.ts
```
