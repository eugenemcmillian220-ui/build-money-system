# Contributing to Sovereign Forge OS

## Branch Naming
- `feat/<ticket>-<description>` — new features
- `fix/<ticket>-<description>` — bug fixes
- `chore/<description>` — maintenance tasks
- `docs/<description>` — documentation only

## Commit Message Format (Conventional Commits)
```
feat: add pipeline phase caching
fix: resolve credit deduction race condition
chore: update dependencies
docs: add troubleshooting guide
test: add unit tests for circuit breaker
```

## PR Checklist
- [ ] Tests pass (`pnpm test:unit`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] No `console.log` left in production code
- [ ] Migration file included if schema changed
- [ ] `.env.example` updated if new env vars added
- [ ] No secrets committed (gitleaks will catch them)

## Review SLA
Maintainers target a 48-hour review window for all PRs.

## Local Dev Setup
```bash
# 1. Clone and install
git clone https://github.com/eugenemcmillian220-ui/build-money-system.git
cd build-money-system
pnpm install

# 2. Copy env vars
cp .env.example .env.local
# Fill in your values

# 3. Start Supabase locally (optional)
npx supabase start

# 4. Run migrations
npx supabase db push

# 5. Start dev server
pnpm dev
```

## Running Tests
```bash
pnpm test:unit          # Unit tests (Vitest)
pnpm test:e2e           # E2E tests (Playwright)
pnpm typecheck          # TypeScript check
pnpm lint               # ESLint
```
