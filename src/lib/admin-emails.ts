/**
 * Centralized list of privileged admin emails.
 *
 * Accounts that match this list get:
 *   1. Free admin access — `admin_free` billing tier, elite-equivalent gating.
 *   2. Email-OTP (6-digit code) based auth — password auth disabled, a fresh
 *      verification code is required for every sign-up AND every sign-in.
 *
 * Keep this list short; each entry grants full unrestricted platform access.
 */
export const ADMIN_EMAILS: readonly string[] = [
  "eugenemcmillian9@gmail.com",
  "eugenemcmillian301@gmail.com",
] as const;

export const ADMIN_FREE_TIER = "admin_free" as const;

/** Unlimited credit grant for admin accounts (9_999_999). */
export const ADMIN_CREDIT_BALANCE = 9_999_999;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const n = normalizeEmail(email);
  if (!n) return false;
  return ADMIN_EMAILS.some((a) => normalizeEmail(a) === n);
}

/**
 * Tiers that should be treated as fully-unlocked / elite for feature gating.
 * Keep in sync with any new premium tier naming.
 */
export const ELITE_EQUIVALENT_TIERS: readonly string[] = [
  "elite",
  "elite_starter",
  "elite_pro",
  "elite_enterprise",
  "pro",
  ADMIN_FREE_TIER,
] as const;

export function isEliteTier(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return ELITE_EQUIVALENT_TIERS.includes(tier);
}
