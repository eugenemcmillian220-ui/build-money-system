"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { SupabaseClient, User } from "@supabase/supabase-js";

async function ensurePersonalOrg(supabase: SupabaseClient, user: User, email: string) {
  const { data: orgs } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id);

  if (!orgs || orgs.length === 0) {
    const slug = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + "-" + Math.random().toString(36).slice(2, 5);
    const { data: newOrg, error: insertError } = await supabase
      .from("organizations")
      .insert({
        name: "Personal Workspace",
        slug,
        owner_id: user.id,
        metadata: { created_by: user.id }
      })
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
        role: "owner"
      });
      if (memberError) console.error("Failed to add user to org_members:", memberError);
    }
  }
}

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
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

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: { 
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://build-money-system.vercel.app"}/auth/callback` 
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
