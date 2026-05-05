import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { Octokit } from "@octokit/rest";
import axios from "axios";

async function runDiagnostics() {
  console.log("🚀 STARTING SOVEREIGN FORGE PHASE 1-20 DIAGNOSTICS...");
  
  const results: any = {
    supabase: { status: "unknown", tables: [], rpcs: [] },
    stripe: { status: "unknown", prices: [] },
    github: { status: "unknown" },
    vercel: { status: "unknown" },
    llm: { status: "unknown", providers: {} },
  };

  // 1. SUPABASE CHECK
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Check tables
    const expectedTables = [
      "projects", "organizations", "org_members", "agent_ledger", 
      "credit_transactions", "billing_subscriptions", "marketing_posts"
    ];
    
    for (const table of expectedTables) {
      const { error } = await supabase.from(table).select("count", { count: "exact", head: true }).limit(1);
      results.supabase.tables.push({ name: table, exists: !error });
    }
    
    // Check RPCs
    const { error: rpcError } = await supabase.rpc("increment_org_balance", { 
      org_id: "00000000-0000-0000-0000-000000000000", 
      amount: 0 
    });
    results.supabase.rpcs.push({ name: "increment_org_balance", working: !rpcError || rpcError.code !== "PGRST202" });

    results.supabase.status = results.supabase.tables.every((t: any) => t.exists) ? "healthy" : "degraded";
  } catch (e) {
    results.supabase.status = "error";
    results.supabase.error = (e as Error).message;
  }

  // 2. STRIPE CHECK
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });
    const prices = await stripe.prices.list({ limit: 10 });
    results.stripe.prices = prices.data.length;
    results.stripe.status = results.stripe.prices > 0 ? "healthy" : "empty";
  } catch (e) {
    results.stripe.status = "error";
    results.stripe.error = (e as Error).message;
  }

  // 3. GITHUB CHECK
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });
    const { data: user } = await octokit.users.getAuthenticated();
    results.github.user = user.login;
    results.github.status = "healthy";
  } catch (e) {
    results.github.status = "error";
    results.github.error = (e as Error).message;
  }

  // 4. LLM PROVIDERS CHECK
  const providers = [
    { name: "OpenRouter", env: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/models" },
    { name: "Groq", env: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/models" },
    { name: "OpenAI", env: "OPENAI_API_KEY", url: "https://api.openai.com/v1/models" }
  ];

  for (const p of providers) {
    try {
      const key = process.env[p.env];
      if (!key) {
        results.llm.providers[p.name] = "missing_key";
        continue;
      }
      const res = await axios.get(p.url, { headers: { Authorization: `Bearer ${key}` } });
      results.llm.providers[p.name] = res.status === 200 ? "healthy" : "error";
    } catch (e) {
      results.llm.providers[p.name] = "error";
    }
  }

  console.log("\n--- DIAGNOSTIC RESULTS ---");
  console.log(JSON.stringify(results, null, 2));
}

runDiagnostics();
