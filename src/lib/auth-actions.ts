"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

import { SupabaseClient, User } from "@supabase/supabase-js";
import {
  ADMIN_CREDIT_BALANCE,
  ADMIN_FREE_TIER,
  isAdminEmail,
  normalizeEmail,
} from "@/lib/admin-emails";

async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function ensurePersonalOrg(supabase: SupabaseClient, user: User, email: string) {
  const { data: orgs } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);

  const adminTier = isAdminEmail(email);

  if (!orgs || orgs.length === 0) {
    // FIX: Use crypto for slug randomness (Math.random is predictable)
    // and use 8 chars instead of 3 to avoid collisions at scale
    const crypto = await import("crypto");
    const slug = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + "-" + crypto.randomUUID().slice(0, 8);
    const insertPayload: Record<string, unknown> = {
      name: adminTier ? "Admin Workspace" : "Personal Workspace",
      slug,
      owner_id: user.id,
      metadata: { created_by: user.id, admin: adminTier },
    };
    if (adminTier) {
      insertPayload.billing_tier = ADMIN_FREE_TIER;
      insertPayload.credit_balance = ADMIN_CREDIT_BALANCE;
    }

    const { data: newOrg, error: insertError } = await supabase
      .from("organizations")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create personal org:", insertError);
      return;
    }

    if (newOrg) {
      const { error: memberError } = await supabase.from("org_members").insert({
        org_id: newOrg.id,
        user_id: user.id,
        role: "owner",
      });
      if (memberError) console.error("Failed to add user to org_members:", memberError);
    }
  } else if (adminTier && supabaseAdmin) {
    // Admin email on an existing org — make sure the admin tier is applied.
    // Using admin client bypasses RLS so we can refresh the tier unconditionally.
    try {
      await supabaseAdmin
        .from("organizations")
        .update({ 
          billing_tier: ADMIN_FREE_TIER, 
          credit_balance: ADMIN_CREDIT_BALANCE,
          metadata: { admin: true, updated_at: new Date().toISOString() } 
        })
        .eq("owner_id", user.id);
    } catch (e) {
      console.warn("Admin tier refresh failed (non-fatal):", e);
    }
  }
}

/**
 * Regular email+password login. For admin emails this path is rejected —
 * admin accounts MUST use the OTP flow (`requestLoginOtp` + `verifyAuthOtp`).
 */
export async function login(formData: FormData) {
  const ip = await getClientIp();
  const email = normalizeEmail(formData.get("email") as string);

  if (isAdminEmail(email)) {
    return {
      error:
        "Admin accounts require a one-time verification code. Use the 'Send verification code' option.",
    };
  }

  // Rate limit: 10 login attempts per IP per minute
  const ipLimit = await rateLimit(`login:ip:${ip}`, 10, 60000);
  if (!ipLimit.success) {
    return { error: "Too many login attempts. Please wait a minute and try again." };
  }

  // Rate limit: 5 login attempts per email per minute (prevents credential stuffing)
  const emailLimit = await rateLimit(`login:email:${email}`, 5, 60000);
  if (!emailLimit.success) {
    return { error: "Too many login attempts for this email. Please wait a minute." };
  }

  const supabase = await createClient();
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string;

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await ensurePersonalOrg(supabase, data.user, email);
  }

  revalidatePath("/", "layout");
  redirect((redirectTo || "/dashboard") as Route);
}

/**
 * Regular email+password signup. Rejected for admin emails — admin signup
 * is exclusively via email OTP.
 */
export async function signup(formData: FormData) {
  const ip = await getClientIp();
  const email = normalizeEmail(formData.get("email") as string);

  if (isAdminEmail(email)) {
    return {
      error:
        "Admin accounts must sign up with an email verification code. Use the 'Send verification code' option instead.",
    };
  }

  // Rate limit: 3 signups per IP per hour (prevents mass account creation)
  const ipLimit = await rateLimit(`signup:ip:${ip}`, 3, 3600000);
  if (!ipLimit.success) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  // Rate limit: 2 signups per email per hour
  const emailLimit = await rateLimit(`signup:email:${email}`, 2, 3600000);
  if (!emailLimit.success) {
    return { error: "A signup was already requested for this email. Check your inbox." };
  }

  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://build-money-system.vercel.app"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Create default personal org for the user if signup was successful and user is not null
  if (data.user) {
    await ensurePersonalOrg(supabase, data.user, email);
  }

  return { success: "Check your email to confirm your account." };
}

/**
 * Request an email OTP (6-digit code) for sign-up OR sign-in.
 * `isSignup=true` allows new-user creation; otherwise the email must already exist.
 *
 * Admin-email paths always use this (a fresh code is required for every login),
 * but regular users can opt-in to passwordless magic-code login if desired.
 */
export async function requestAuthOtp(formData: FormData) {
  const email = normalizeEmail(formData.get("email") as string);
  const isSignup = formData.get("mode") === "signup";
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
  }

  const ip = await getClientIp();
  const adminEmail = isAdminEmail(email);

  // Rate limit: stricter for non-admin to prevent mail-bombing, but admin still gets some ceiling.
  const keyScope = adminEmail ? "admin" : "user";
  const perIp = await rateLimit(`otp:ip:${keyScope}:${ip}`, adminEmail ? 20 : 10, 3600000);
  if (!perIp.success) {
    return { error: "Too many verification requests. Please wait before requesting another code." };
  }
  const perEmail = await rateLimit(`otp:email:${email}`, 6, 600000);
  if (!perEmail.success) {
    return { error: "Too many codes requested for this email. Wait 10 minutes." };
  }

  const supabase = await createClient();
  // NOTE: We intentionally omit `emailRedirectTo` so Supabase prioritises the
  // 6-digit `{{ .Token }}` rendered by our custom Magic Link email template.
  // The embedded "Click here" fallback link uses the project `site_url`.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: isSignup || adminEmail, // admin auto-creates on first login
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: `Verification code sent to ${email}. Check your inbox (it may take up to a minute).`,
    admin: adminEmail,
  };
}

/**
 * Verifies a 6-digit email OTP. On success, returns `{ success: true }` and
 * the caller redirects — we intentionally don't `redirect()` from inside the
 * action so the client can show a confirmation state first.
 */
export async function verifyAuthOtp(formData: FormData) {
  const email = normalizeEmail(formData.get("email") as string);
  const token = ((formData.get("token") as string) || "").trim();
  const rawRedirect = (formData.get("redirectTo") as string) || "/dashboard";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

  if (!email || !token) {
    return { error: "Email and code are required." };
  }
  if (!/^\d{6}$/.test(token)) {
    return { error: "Enter the 6-digit code from your email." };
  }

  const ip = await getClientIp();
  const perIp = await rateLimit(`otp:verify:ip:${ip}`, 20, 600000);
  if (!perIp.success) {
    return { error: "Too many verification attempts. Please wait a few minutes." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await ensurePersonalOrg(supabase, data.user, email);
  }

  revalidatePath("/", "layout");
  return { success: true, redirectTo };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Repairs a user's account by ensuring they have a personal organization.
 * Used when a user exists but has no linked organization (e.g. after schema updates).
 */
export async function repairOrganization() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  await ensurePersonalOrg(supabase, user, user.email || "");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  try {
    // Delete the user from auth.users using admin client
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    // Sign out from the current session
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("Failed to delete account:", err);
    return { error: (err as Error).message };
  }
}
