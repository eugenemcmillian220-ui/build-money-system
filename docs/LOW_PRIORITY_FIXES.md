# Low-Priority Fixes (DA-090 — DA-101)

## DA-090: Missing UpdatedAt Triggers
Add `updated_at` trigger to new tables in schema.sql.

## DA-091: Redundant Health Check Endpoints
Consolidate `/api/health` and `/api/health/check` into a single endpoint.

## DA-092: Unsafe Type Casting
Replace `as any` casts in dao and federation routes with proper typing.

## DA-093: Lack of Idempotency
Add idempotency keys to fullstack and swarm creation routes.

## DA-094: Inconsistent Response Format
Standardize all API responses to `{ success, data, error }` shape.

## DA-095: Synchronous Fallback Logic
In ai-team.ts, make fallback paths async to avoid blocking.

## DA-096: Tight Coupling to Slack
Abstract notification channel (Slack) behind an interface for future flexibility.

## DA-097: Direct PG Driver Usage
Remove `pg` package if only using Supabase client (avoid dual connection pools).

## DA-098: Hardcoded UI Strings
Extract all user-visible strings to a constants file for future i18n.

## DA-099: Hardcoded Pricing Values
Move pricing tiers from component JSX to a config file or CMS.

## DA-100: Inconsistent Error Response Structure
Standardize VibeCart error responses to match main app format.

## DA-101: Missing Infrastructure Validation
Add `terraform validate` and `tflint` to CI pipeline for all portfolio projects.
