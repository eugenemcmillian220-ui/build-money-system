import { supabaseAdmin } from "../src/lib/supabase/admin";
import { ADMIN_EMAILS, ADMIN_FREE_TIER, ADMIN_CREDIT_BALANCE } from "../src/lib/admin-emails";

async function main() {
  if (!supabaseAdmin) {
    console.error("Supabase admin client not available");
    return;
  }

  const email = "eugenemcmillian9@gmail.com";
  console.log(`Checking status for ${email}...`);

  // 1. Get user by email
  const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) {
    console.error("Error listing users:", userError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.log(`User ${email} not found in Auth.`);
    // Since I can't easily create a user without a password or trigger an invite here reliably 
    // and have it work with the platform's OTP flow, I'll just assume they will sign up.
    // However, the task says "Grant", so I should probably create them if possible.
    
    // Let's try to create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      return;
    }
    
    console.log(`User ${email} created successfully.`);
    // Now continue with newUser.user
    await handleOrg(newUser.user);
  } else {
    console.log(`User ${email} found with ID: ${user.id}`);
    await handleOrg(user);
  }
}

async function handleOrg(user: any) {
  // 2. Check for personal org
  const { data: orgs, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("owner_id", user.id);

  if (orgError) {
    console.error("Error fetching orgs:", orgError);
    return;
  }

  if (!orgs || orgs.length === 0) {
    console.log("No organization found for user. Creating one...");
    const slug = user.email.split("@")[0] + "-admin";
    const { data: newOrg, error: insertError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: "Admin Workspace",
        slug,
        owner_id: user.id,
        billing_tier: ADMIN_FREE_TIER,
        credit_balance: ADMIN_CREDIT_BALANCE,
        metadata: { admin: true, created_by: 'system_grant' }
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating org:", insertError);
    } else {
      console.log("Admin organization created successfully.");
      // Add member
      await supabaseAdmin.from("org_members").insert({
        org_id: newOrg.id,
        user_id: user.id,
        role: "owner"
      });
    }
  } else {
    console.log(`Found ${orgs.length} org(s). Updating them to admin status...`);
    for (const org of orgs) {
      const { error: updateError } = await supabaseAdmin
        .from("organizations")
        .update({
          billing_tier: ADMIN_FREE_TIER,
          credit_balance: ADMIN_CREDIT_BALANCE,
          metadata: { ...org.metadata, admin: true }
        })
        .eq("id", org.id);

      if (updateError) {
        console.error(`Error updating org ${org.id}:`, updateError);
      } else {
        console.log(`Organization ${org.id} updated to admin status.`);
      }
    }
  }
}

main();
