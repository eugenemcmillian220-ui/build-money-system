import Stripe from "stripe";
import * as dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// === SUBSCRIPTION PRODUCTS ===
const SUBSCRIPTION_PRODUCTS = [
  // Elite Empire (Phases 1-17)
  {
    id: "elite_enterprise",
    name: "Elite Enterprise (Phases 1-17)",
    description: "Full 17-Phase Suite: Hive Mind, M&A Engine, Legal & IP Vault. Key Focus: Legal, Hive & M&A.",
    monthly: 99900, // $999
    yearly: 79900 * 12, // $799/mo billed annually
    credits: 150000,
    keyFocus: "Legal, Hive & M&A"
  },
  {
    id: "elite_pro",
    name: "Elite Pro (Phases 1-17)",
    description: "Full 17-Phase Access with Autonomous VC Investment and Agentic B2B Diplomacy. Key Focus: VC & Diplomacy.",
    monthly: 24900, // $249
    yearly: 19900 * 12, // $199/mo billed annually
    credits: 35000,
    keyFocus: "VC & Diplomacy"
  },
  {
    id: "elite_starter",
    name: "Elite Starter (Phases 1-17)",
    description: "Full 17-Phase Access with Autonomous Governance and Edge Scale Orchestration. Key Focus: Governance & Edge.",
    monthly: 9900, // $99
    yearly: 7900 * 12, // $79/mo billed annually
    credits: 10000,
    keyFocus: "Governance & Edge"
  },
  // Basic Foundation (Phases 1-3)
  {
    id: "basic_premium",
    name: "Basic Premium (Phases 1-3)",
    description: "Phases 1-3 Foundation with Custom Database Templates and Early Feature Access.",
    monthly: 9900, // $99
    yearly: 7900 * 12, // $79/mo billed annually
    credits: 7000
  },
  {
    id: "basic_pro",
    name: "Basic Pro (Phases 1-3)",
    description: "Phases 1-3 Foundation with Unlimited Projects and Priority Queue.",
    monthly: 4900, // $49
    yearly: 3900 * 12, // $39/mo billed annually
    credits: 3000
  },
  {
    id: "basic_starter",
    name: "Basic Starter (Phases 1-3)",
    description: "Core Phase 1-3 Foundation with Full Component Generation and Supabase Integration.",
    monthly: 1900, // $19
    yearly: 1500 * 12, // $15/mo billed annually
    credits: 1000
  },
  {
    id: "basic_mini",
    name: "Basic Mini (Phases 1-3)",
    description: "Entry-level Phase 1-3 Foundation with Single Component Generation.",
    monthly: 500, // $5
    yearly: 400 * 12, // $4/mo billed annually
    credits: 300
  }
];

// === LIFETIME LICENSE PRODUCTS ===
const LIFETIME_PRODUCTS = [
  {
    id: "lifetime_starter",
    name: "Lifetime Starter License",
    description: "One-time payment for lifetime access to Basic features (Phases 1-3). Includes 1,000 credits/mo forever.",
    price: 79000 // $790
  },
  {
    id: "lifetime_pro",
    name: "Lifetime Pro License",
    description: "One-time payment for lifetime access to all Elite features (Phases 1-17). Includes 5,000 credits/mo forever.",
    price: 239000 // $2,390
  },
  {
    id: "onprem_perpetual",
    name: "On-Prem Perpetual License",
    description: "Self-hosted deployment with full source code access. Unlimited internal users, no cloud dependency.",
    price: 499900 // $4,999
  }
];

// === CREDIT PACK PRODUCTS ===
const CREDIT_PACKS = [
  {
    id: "credits_5k",
    name: "5,000 Credits Pack",
    description: "Standard credit top-up for AI Agents, Sandboxes, and Vision-to-Code.",
    price: 2000 // $20
  },
  {
    id: "credits_15k",
    name: "15,000 Credits Pack (17% Savings)",
    description: "Bulk credit pack with 17% savings. Great for growing teams.",
    price: 5000 // $50
  },
  {
    id: "credits_50k",
    name: "50,000 Credits Pack (25% Savings)",
    description: "Enterprise credit pack with 25% bulk discount.",
    price: 15000 // $150
  }
];

interface CreatedPrice {
  productId: string;
  type: "subscription" | "lifetime" | "credits";
  monthly?: string;
  yearly?: string;
  oneTime?: string;
}

async function setup() {
  console.log("====================================================");
  console.log("   BUILD MONEY SYSTEM - Stripe Product Setup");
  console.log("====================================================\n");

  const createdPrices: CreatedPrice[] = [];

  // --- Create Subscription Products ---
  console.log("CREATING SUBSCRIPTION PRODUCTS (Premium Only - No Free Tier)\n");
  console.log("--- Elite Empire (Phases 1-17) ---");

  for (const p of SUBSCRIPTION_PRODUCTS) {
    const isElite = p.id.startsWith("elite");
    if (isElite && p.id === "elite_enterprise") {
      console.log("\n--- Basic Foundation (Phases 1-3) ---");
    }
    if (!isElite && p.id === "basic_premium") {
      console.log("");
    }

    console.log(`Creating: ${p.name}`);
    
    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: {
        internal_id: p.id,
        credits_per_month: p.credits.toString(),
        category: isElite ? "elite" : "basic",
        ...(p.keyFocus && { key_focus: p.keyFocus })
      }
    });

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.monthly,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { type: "monthly", tier: p.id }
    });

    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.yearly,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { type: "yearly", tier: p.id }
    });

    createdPrices.push({
      productId: p.id,
      type: "subscription",
      monthly: monthlyPrice.id,
      yearly: yearlyPrice.id
    });

    console.log(`  + Monthly: $${p.monthly / 100}/mo | Yearly: $${Math.round(p.yearly / 12 / 100)}/mo (Save 20%)`);
    console.log(`  + Credits: ${p.credits.toLocaleString()}/mo`);
  }

  // --- Create Lifetime License Products ---
  console.log("\n\nCREATING LIFETIME LICENSE PRODUCTS (Specialized Licensing)\n");

  for (const p of LIFETIME_PRODUCTS) {
    console.log(`Creating: ${p.name}`);
    
    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: {
        internal_id: p.id,
        type: "lifetime_license"
      }
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: p.price,
      currency: "usd",
      metadata: { type: "lifetime", license_id: p.id }
    });

    createdPrices.push({
      productId: p.id,
      type: "lifetime",
      oneTime: price.id
    });

    console.log(`  + One-time: $${(p.price / 100).toLocaleString()}`);
  }

  // --- Create Credit Pack Products ---
  console.log("\n\nCREATING CREDIT TOP-UP PACKS\n");

  for (const p of CREDIT_PACKS) {
    console.log(`Creating: ${p.name}`);
    
    const product = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: {
        internal_id: p.id,
        type: "credit_pack"
      }
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: p.price,
      currency: "usd",
      metadata: { type: "credits", pack_id: p.id }
    });

    createdPrices.push({
      productId: p.id,
      type: "credits",
      oneTime: price.id
    });

    console.log(`  + Price: $${p.price / 100}`);
  }

  // --- Output Environment Variables ---
  console.log("\n\n" + "=".repeat(60));
  console.log("STRIPE SETUP COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nCopy these environment variables to your .env file:\n");
  console.log("# === Subscription Price IDs ===");
  
  for (const price of createdPrices.filter(p => p.type === "subscription")) {
    const envPrefix = price.productId.toUpperCase().replace(/-/g, "_");
    console.log(`STRIPE_PRICE_${envPrefix}_MONTHLY=${price.monthly}`);
    console.log(`STRIPE_PRICE_${envPrefix}_YEARLY=${price.yearly}`);
  }

  console.log("\n# === Lifetime License Price IDs ===");
  for (const price of createdPrices.filter(p => p.type === "lifetime")) {
    const envPrefix = price.productId.toUpperCase().replace(/-/g, "_");
    console.log(`STRIPE_PRICE_${envPrefix}=${price.oneTime}`);
  }

  console.log("\n# === Credit Pack Price IDs ===");
  for (const price of createdPrices.filter(p => p.type === "credits")) {
    const envPrefix = price.productId.toUpperCase().replace(/-/g, "_");
    console.log(`STRIPE_PRICE_${envPrefix}=${price.oneTime}`);
  }

  console.log("\n\nWEBHOOK CONFIGURATION:");
  console.log("=".repeat(40));
  console.log("Endpoint URL: https://build-money-system.vercel.app/api/billing/webhook");
  console.log("\nRequired Events:");
  console.log("  - checkout.session.completed");
  console.log("  - customer.subscription.updated");
  console.log("  - customer.subscription.deleted");
  console.log("  - invoice.payment_succeeded");
  console.log("  - invoice.payment_failed");

  console.log("\n\nMARKETPLACE & AFFILIATE CONFIG:");
  console.log("=".repeat(40));
  console.log("  - Marketplace Commission: 25% on agent-to-agent transactions");
  console.log("  - Affiliate Program: 20% recurring commission on referrals");
  console.log("  - Credit Top-up Base: $20 for 5,000 credits (with bulk discounts)");
}

setup().catch(err => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
