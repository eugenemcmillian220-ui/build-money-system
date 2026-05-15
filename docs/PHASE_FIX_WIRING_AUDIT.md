# Phase Fix & Wiring Audit (May 15, 2026)

This checklist translates the current codebase into a practical “what still needs fixing/wiring” view by phase.

## Phase 1 — Core Generation + Sculptor
- **Wired:** Core generation and iterative build endpoints exist (`/api/build-company`, `/api/fullstack`, `/api/generate-advanced`, `/api/sculpt`).
- **Needs fixing/wiring:** Normalize request/response envelopes across generation routes to one canonical shape (`{ success, data, error }`) and align error codes.

## Phase 2 — SQL Forge / Data Layer
- **Wired:** Canonical schema + migrations present under `supabase/schema.sql` and `supabase/migrations/`.
- **Needs fixing/wiring:** Add migration drift check in CI (schema diff against remote), and enforce idempotent migration scripts for re-runs.

## Phase 3 — App Assembly
- **Wired:** Next.js App Router pages, project CRUD routes (`/api/projects`, `/api/projects/[id]`), deployment route (`/api/deploy`).
- **Needs fixing/wiring:** Enforce shared DTO/types between project APIs and UI to remove implicit `any`/shape drift.

## Phase 4 — Sentinel Security Hardening
- **Wired:** Security-centered migrations exist (RLS + security fixes).
- **Needs fixing/wiring:** Add automated security regression tests for RLS policies and critical write paths.

## Phase 5 — Stabilization
- **Wired:** Phase tests present (`tests/phase5.test.ts`).
- **Needs fixing/wiring:** Integrate these tests into default CI path so regressions block merges.

## Phase 6 — Reliability Baseline
- **Wired:** Coverage test exists (`tests/phase6.test.ts`).
- **Needs fixing/wiring:** Add synthetic load/timeout tests for long-running API calls to match Vercel Hobby runtime limits.

## Phase 7 — Self-Healing (Healer)
- **Wired:** Healing endpoints present (`/api/heal`, `/api/self-improve`, `/api/evolution`).
- **Needs fixing/wiring:** Introduce governance guardrails (rate limits + signed audit log entries) before autonomous mutation actions.

## Phase 8 — Security Audit Layer
- **Wired:** Phase documentation exists (`public/docs/phase8.html`).
- **Needs fixing/wiring:** Add executable audit checks tied to phase doc claims (lintable policy + test assertions).

## Phase 9 — Expansion + E2E
- **Wired:** Tests exist (`tests/phase9-logic.test.ts`, `tests/phase9-e2e.test.ts`).
- **Needs fixing/wiring:** Promote E2E suite into release gate with clear pass/fail artifacts.

## Phase 10 — Economy Engine
- **Wired:** Economy migration and billing APIs exist (`/api/billing/*`, phase economy RPC migration).
- **Needs fixing/wiring:** Validate consistency between billing webhook credits and ledger balance writes under retries.

## Phase 11 — Herald / Go-To-Market
- **Wired:** Marketing-oriented phase docs and related automation endpoints exist.
- **Needs fixing/wiring:** Add explicit content approval mode and traceability for outbound campaign actions.

## Phase 12 — Platform Maturity
- **Wired:** Phase documentation exists (`public/docs/phase12.html`).
- **Needs fixing/wiring:** Consolidate duplicate/legacy API paths and enforce deprecation policy in docs + runtime warnings.

## Phase 13 — Advanced Economy / Staking
- **Wired:** Phase docs and economy foundations exist.
- **Needs fixing/wiring:** Wire staking/revshare lifecycle events to immutable audit tables and reconciliation jobs.

## Phase 14 — Broker Foundation
- **Wired:** Governance, federation, and growth endpoints are present.
- **Needs fixing/wiring:** Define and enforce partner/deal state machine transitions in DB constraints.

## Phase 15 — Hive / Swarm Mesh
- **Wired:** Swarm mesh migration exists (`20260416_phase22_swarm_mesh.sql` expands this direction).
- **Needs fixing/wiring:** Complete idempotency + conflict resolution for multi-agent writes.

## Phase 16 — Portfolio / Federation Expansion
- **Wired:** Federation sync + related cron endpoints exist.
- **Needs fixing/wiring:** Add replay-safe sync cursoring and dead-letter handling for federation jobs.

## Phase 17 — Legal Vault / Compliance
- **Wired:** Compliance endpoint and governance surfaces are present.
- **Needs fixing/wiring:** Add policy pack versioning and evidence bundle export for audit-ready compliance snapshots.

## Phase 18 — Scout / Prebuild Intelligence
- **Wired:** Scout phase docs and analyze endpoints exist (`/api/rd/scout`, `/api/ma/analyze`).
- **Needs fixing/wiring:** Add caching + source attribution persistence for reproducible research outputs.

## Phase 19 — Manifest Orchestration
- **Wired:** Dedicated blueprint + DAO/RPC + pulse/manifest jobs infrastructure exist.
- **Needs fixing/wiring:** Complete end-to-end trace correlation IDs across all manifest sub-agents and queue retries.

## Phase 20 — Sovereign Agents
- **Wired:** Agent-era migrations and active jobs/status routes exist.
- **Needs fixing/wiring:** Enforce per-agent budgets/quotas and automatic circuit breakers for runaway loops.

## Phase 21 — Unified Dashboard Restoration
- **Wired:** FlowForge area and dashboard-oriented pages/routes exist.
- **Needs fixing/wiring:** Remove stale references to legacy dashboard paths and unify role-based access checks.

## Phase 22 — Swarm Mesh (Blueprinted)
- **Wired:** Blueprint + migration present.
- **Needs fixing/wiring:** Finish production scheduling policy (priority queues, fairness, cancellation semantics).

## Phase 23 — Sovereign Pulse
- **Wired:** Pulse migration and ingest API route exist.
- **Needs fixing/wiring:** Implement anomaly thresholds + alert routing and verify retention policy.

## Phase 24 — OpenCode Zen Upgrade
- **Wired:** Migration present (`20260424000000_opencode_zen.sql`) and LLM fallback system exists.
- **Needs fixing/wiring:** Add provider health scoring and automated failback once primaries recover.

## Phase 25 — Vector Memory
- **Wired:** Blueprint + vector memory migration exist.
- **Needs fixing/wiring:** Complete retrieval quality evaluation harness (precision/recall-style checks + grounding tests).

---

## Cross-Phase Fixes to Prioritize First
1. Standardize API response contract for all app + portfolio endpoints.
2. Add CI gates for:
   - Supabase migration drift
   - RLS/security regression tests
   - Existing phase test suites (5/6/9 + smoke)
3. Add idempotency keys + retry safety to mutation-heavy routes.
4. Add distributed trace correlation IDs from request edge -> agent pipeline -> DB writes.
