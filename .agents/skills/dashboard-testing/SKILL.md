# Dashboard + admin-OTP testing

Scope: Sovereign Forge OS dashboard (`/dashboard`), admin email OTP login, and perf regressions in client-side data fetching.

## Devin Secrets Needed
- `SUPABASE_MANAGEMENT_API_TOKEN` — patches email templates / OTP length via https://api.supabase.com
- `VERCEL_TOKEN` — pulls `.env.local` (`vercel env pull`) so you can run the Next.js app locally against live Supabase
- Admin email: `eugenemcmillian9@gmail.com` — user must relay the 6-digit code when prompted; it is NOT stored as a secret

## App-specific setup
```bash
cd /home/ubuntu/repos/build-money-system
vercel env pull .env.local --yes --token="$VERCEL_TOKEN"
npm run dev > /tmp/next-dev.log 2>&1 &
```
First hit to any `/dashboard*` route costs ~20s of Turbopack compile. **Always warm the route once before measuring anything.**

## Admin OTP login flow — things that can go wrong
1. **Email contains only a magic link, not a 6-digit code.** Root cause: Supabase project has `mailer_otp_length != 6` or the `magic_link` email template doesn't render `{{ .Token }}`. Fix via Management API (see `/tmp/update_template.py` history in prior PR #51 session for a working payload) — set `mailer_otp_length: 6` and a `mailer_templates_magic_link_content` that prominently shows `{{ .Token }}`.
2. **Magic-link click redirects to Vercel SSO login instead of the app.** If `NEXT_PUBLIC_SITE_URL` points at the SSO-protected prod domain, the callback loops. Drop `emailRedirectTo` from `supabase.auth.signInWithOtp({...})` so the 6-digit code is the primary CTA, and harden `/auth/callback` to support both `?code=…` (PKCE) and `?token_hash=…&type=…`.
3. **Admin tier drifts.** `re-assertAdminTier()` should run on every admin login, not only signup — otherwise anyone editing the `organizations` row can silently demote the admin.

## Measuring dashboard paint latency (THE skill)

The trap: in Next.js dev mode, `location.reload()` on `/dashboard` costs 10-20s of bundle-fetch + compile time that has **nothing to do with the React code under test**. Measuring wall-clock from reload will falsely flag fast code as slow.

**Correct technique**: measure a client-side route transition (SPA nav) instead. That isolates the React data-fetching layer from dev-server costs.

```js
// 1. On any dashboard sub-page (e.g. /dashboard/billing), install instrumentation:
window.__paintMs = null; window.__perfLog = [];
const origFetch = window.fetch;
window.fetch = function (...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
  const t0 = performance.now();
  if (url && /\/api\/(ceo|rd)|organizations|projects/.test(url)) {
    window.__perfLog.push({ type: 'fetch-start', url, t: t0.toFixed(0) });
  }
  return origFetch.apply(this, args);
};
window.__observer = new MutationObserver(() => {
  if (window.__paintMs !== null) return;
  const hit = [...document.querySelectorAll('*')].find(e =>
    (e.textContent || '').trim().toUpperCase().startsWith('NEURAL CREDITS'));
  if (hit && /[0-9\u221E]/.test(hit.parentElement?.textContent || '')) {
    window.__paintMs = performance.now() - window.__navStart;
    window.__perfLog.push({ type: 'PAINT', elapsedMs: window.__paintMs.toFixed(0) });
  }
});
window.__observer.observe(document.body, { childList: true, subtree: true });

// 2. Capture nav-start + click the Dashboard sidebar link in the SAME script:
window.__navStart = performance.now();
document.querySelector('a[href="/dashboard"]').click();

// 3. Wait 5-8s, then read window.__paintMs + window.__perfLog.
```

Adversarial reading of `__perfLog`:
- `/api/ceo/report` and `/api/rd/scout` fetch-starts should be within ~1-100 ms of each other. If they are hundreds-to-thousands of ms apart, someone reverted `Promise.allSettled` back to serial awaits.
- `PAINT` event should come *before* the projects/CEO/scout fetches settle. If it doesn't, someone put `setLoading(false)` back in a `finally` block.
- React strict mode in dev will double-fire all effects, so expect duplicated `organizations` / `/api/ceo/report` / `/api/rd/scout` fetch-starts. Don't confuse the double-fire with a real regression.

## Pass/fail thresholds
- Client-side nav paint: ≤ 3000 ms is healthy, ≤ 5000 ms acceptable, > 15000 ms indicates the serial-await regression is back.
- Hard reload paint: add ~8-15 s for dev-mode bundle fetch; only use this number as a rough sanity check, not a pass/fail.

## Known fallbacks to expect (not failures)
- `/api/ceo/report` sometimes 400s when the CEO agent hits its rate limit. The dashboard MUST still paint — the CEO section shows "CEO agent encountered a neural link error" fallback. If the whole page blocks on this, the Promise.allSettled fix is broken.
- Admin Sovereign Tier pill may render as raw `admin_free` string on branches that haven't merged PR #51's display tweaks — that's a cosmetic regression, not a data problem.

## Where to read results
- PR #51 established the OTP + initial 25-phase UI pipeline.
- PR #53 established the dashboard paint performance fix (1117 ms target).
- Both use the same measurement technique described above — reuse it for any future `fetchDashboardData` changes.
