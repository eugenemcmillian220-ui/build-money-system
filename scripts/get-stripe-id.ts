import Stripe from "stripe";

const stripe = new Stripe("sk_test_51TIsThIYSZ7ijCe4OmVxkLS8yq7e5xbBC8SUIDu0p4Fbvyg8vRdKRD5LvJPopLa9L9S3BJAgPXyD9D0J8XZycfP000Z5Yi9lZR", {
  apiVersion: "2024-06-20",
});

async function main() {
  try {
    const account = await stripe.accounts.retrieve();
    console.log("Account ID:", account.id);
  } catch (error) {
    console.error("Error retrieving account:", error);
  }
}

main();
