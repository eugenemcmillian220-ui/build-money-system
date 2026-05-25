# Changelog

All notable changes to Sovereign Forge OS are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0] — 2026-05-25

### Added
- 25-phase AI pipeline with ~98 agents for end-to-end SaaS generation
- Parallel agent execution with exponential backoff retry
- Redis output caching (Upstash) for pipeline restart recovery
- Supabase Realtime streaming of pipeline phase outputs to dashboard
- Complete Supabase data layer: 15 tables, RLS policies, audit trail, pgTAP tests
- Production-grade Stripe webhook handler with idempotency (8 event types)
- Circuit breaker for LLM provider chain (Supabase-backed cross-instance state)
- Zod schema library for all request/response types
- Centralized error taxonomy with HTTP status codes and retry flags
- CommandPalette (⌘K) with navigation shortcuts and quick actions
- NotificationBell with Supabase Realtime unread count
- Skeleton loading states for all data-fetching components
- Error boundary components (dashboard, phase output, generator form)
- PipelineProgress with live Supabase Realtime updates
- DeliverableDownloader with signed URL and share functionality
- SpecValidationReport with assumption override UI
- v1 API routes: pipeline, projects, billing, health
- AI cost tracking per feature (ai_usage_log table)
- Context window management for LLM conversations
- Prompt versioning system with A/B routing
- Vitest unit tests for 5 critical utilities
- Playwright E2E tests for onboarding and pipeline flows
- GitHub Actions CI/CD: lint → typecheck → unit tests → build → deploy
- Gitleaks secret scanning in CI
- .env.example with 40+ variables classified as PUBLIC/SERVER/SECRET
- CONTRIBUTING.md with Conventional Commits and PR checklist
- docs/TROUBLESHOOTING.md with 10 common setup errors

### Security
- CSP headers, HSTS, X-Frame-Options, Permissions-Policy in middleware
- CSRF protection for all mutation endpoints
- Stripe webhook signature verification (300s tolerance)
- RLS policies on all 15 Supabase tables
- Audit trail triggers on sensitive tables
- Secret scanning in CI (gitleaks)

[Unreleased]: https://github.com/eugenemcmillian220-ui/build-money-system/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/eugenemcmillian220-ui/build-money-system/releases/tag/v1.0.0
