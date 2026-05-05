import Stripe from "stripe";

const stripe = new Stripe("sk_test_51TIsThIYSZ7ijCe4OmVxkLS8yq7e5xbBC8SUIDu0p4Fbvyg8vRdKRD5LvJPopLa9L9S3BJAgPXyD9D0J8XZycfP000Z5Yi9lZR", {
  apiVersion: "2024-06-20",
});

async function listStripeResources() {
  console.log("--- Products and Prices ---");
  const prices = await stripe.prices.list({
    limit: 100,
    expand: ["data.product"],
  });

  for (const p of prices.data) {
    const product = p.product as Stripe.Product;
    const interval = p.type === "recurring" ? p.recurring?.interval : "one-time";
    console.log(`Product: ${product.name} | PriceID: ${p.id} | Amount: ${(p.unit_amount || 0) / 100} ${p.currency.toUpperCase()} | Type: ${interval}`);
  }
}

listStripeResources().catch(console.error);
