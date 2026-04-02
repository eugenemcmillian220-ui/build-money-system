"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string;

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Ensure user has a personal organization
  const { data: orgs } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", data.user.id)
    .limit(1);

  if (!orgs || orgs.length === 0) {
    // Create personal org
    const slug = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") + "-" + Math.random().toString(36).slice(2, 5);
    const { data: newOrg } = await supabase
      .from("organizations")
      .insert({ name: "Personal Workspace", slug })
      .select()
      .single();
    
    if (newOrg) {
      await supabase.from("org_members").insert({
        org_id: newOrg.id,
        user_id: data.user.id,
        role: "owner"
      });
    }
  }

  revalidatePath("/", "layout");
  redirect((redirectTo || "/app") as Route);
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback` },
  });

  if (error) {
    return { error: error.message };
  }

  // Create default personal org for the user if signup was successful and user is not null
  if (data.user) {
    const slug = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") + "-" + Math.random().toString(36).slice(2, 5);
    const { data: newOrg } = await supabase
      .from("organizations")
      .insert({ name: "Personal Workspace", slug })
      .select()
      .single();
    
    if (newOrg) {
      await supabase.from("org_members").insert({
        org_id: newOrg.id,
        user_id: data.user.id,
        role: "owner"
      });
    }
  }

  return { success: "Check your email to confirm your account." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
