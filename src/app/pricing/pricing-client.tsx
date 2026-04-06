"use client";

import { useSearchParams } from "next/navigation";
import { PricingTable } from "@/components/billing/pricing-table";

// For the public pricing page, we use a placeholder orgId
// Users will be redirected to sign up/login before checkout
const PLACEHOLDER_ORG_ID = "00000000-0000-0000-0000-000000000000";

export function PricingTableClient() {
  const searchParams = useSearchParams();
  const affiliateCode = searchParams.get("ref") || undefined;

  return (
    <PricingTable 
      orgId={PLACEHOLDER_ORG_ID} 
      affiliateCode={affiliateCode}
    />
  );
}
