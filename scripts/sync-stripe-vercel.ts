import Stripe from "stripe";
import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const PRODUCTS = [
  { id: "basic_mini", name: "Basic Mini", monthly: 500, yearly: 400 * 12 },
  { id: "basic_starter", name: "Basic Starter", monthly: 1900, yearly: 1500 * 12 },
  { id: "basic_pro", name: "Basic Pro", monthly: 4900, yearly: 3900 * 12 },
  { id: "basic_premium", name: "Basic Premium", monthly: 9900, yearly: 7900 * 12 },
  { id: "elite_starter", name: "Elite Starter", monthly: 9900, yearly: 7900 * 12 },
  { id: "elite_pro", name: "Elite Pro Builder", monthly: 24900, yearly: 19900 * 12 },
  { id: "elite_enterprise", name: "Elite Enterprise Empire", monthly: 99900, yearly: 79900 * 12 },
];

async function updateVercelEnv(key: string, value: string) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return;
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env${teamParam}`;
  
  try {
    await axios.post(url, {
      key,
      value,
      type: "plain",
      target: ["production", "preview", "development"]
    }, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
    });
    console.log(`   ✅ Synced ${key} to Vercel.`);
  } catch (err: any) {
    console.warn(`   ⚠️ Could not sync ${key}: ${err.response?.data?.error?.message || err.message}`);
  }
}

async function sync() {
  console.log("🚀 Starting Master Stripe-Vercel Sync...");

  for (const p of PRODUCTS) {
    console.log(`\n📦 Tier: ${p.name}`);
    
    const product = await stripe.products.create({ name: p.name });

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.monthly,
      currency: "usd",
      recurring: { interval: "month" },
    });

    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.yearly,
      currency: "usd",
      recurring: { interval: "year" },
    });

    // Sync to Vercel
    const prefix = p.id.toUpperCase();
    await updateVercelEnv(`STRIPE_${prefix}_MONTHLY_PRICE_ID`, monthlyPrice.id);
    await updateVercelEnv(`STRIPE_${prefix}_YEARLY_PRICE_ID`, yearlyPrice.id);
  }

  console.log("\n✨ Master Sync Complete. Your 17-Phase Empire is commercially live.");
}

sync().catch(console.error);
