import Stripe from "stripe";
import * as dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const PRODUCTS = [
  {
    id: "elite_enterprise",
    name: "Elite Enterprise Empire (Phases 1-17)",
    description: "Full 17-Phase Suite, Hive Mind, Autonomous M&A, Legal & IP Vault.",
    monthly: 99900,
    yearly: 79900 * 12,
    credits: 150000
  },
  {
    id: "elite_pro",
    name: "Elite Pro Builder (Phases 1-14)",
    description: "Phases 1-14 Access, Autonomous VC Investment, Agentic Diplomacy (B2B).",
    monthly: 24900,
    yearly: 19900 * 12,
    credits: 35000
  },
  {
    id: "elite_starter",
    name: "Elite Starter (Phases 1-12)",
    description: "Phases 1-12 Access, Autonomous Governance (HITL), Edge Scale Orchestration.",
    monthly: 9900,
    yearly: 7900 * 12,
    credits: 10000
  },
  {
    id: "basic_premium",
    name: "Basic Premium (Phases 1-3)",
    description: "Phases 1-3 Foundation with Custom Database Templates.",
    monthly: 9900,
    yearly: 7900 * 12,
    credits: 7000
  },
  {
    id: "basic_pro",
    name: "Basic Pro (Phases 1-3)",
    description: "Phases 1-3 Foundation with Priority Support.",
    monthly: 4900,
    yearly: 3900 * 12,
    credits: 3000
  },
  {
    id: "basic_starter",
    name: "Basic Starter (Phases 1-3)",
    description: "Core Phase 1-3 Foundation.",
    monthly: 1900,
    yearly: 1500 * 12,
    credits: 1000
  },
  {
    id: "basic_mini",
    name: "Basic Mini (Phases 1-3)",
    description: "Entry-level Phase 1-3 Foundation.",
    monthly: 500,
    yearly: 400 * 12,
    credits: 300
  }
];

async function setup() {
  console.log("🚀 Starting Stripe Autonomous Setup...");

  for (const p of PRODUCTS) {
    console.log(`\n📦 Creating Product: ${p.name}`);
    
    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: {
        internal_id: p.id,
        credits_per_month: p.credits.toString()
      }
    });

    console.log(`   - Creating Monthly Price ($${p.monthly/100}/mo)`);
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.monthly,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { type: "monthly", tier: p.id }
    });

    console.log(`   - Creating Yearly Price ($${p.yearly/1200}/mo effective)`);
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.yearly,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { type: "yearly", tier: p.id }
    });

    console.log(`✅ Success! Product: ${product.id}`);
    console.log(`   Monthly Price ID: ${monthlyPrice.id}`);
    console.log(`   Yearly Price ID: ${yearlyPrice.id}`);
  }

  console.log("\n✨ Stripe Setup Complete. All 16-Phase Tiers are now live in your Dashboard.");
}

setup().catch(err => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
