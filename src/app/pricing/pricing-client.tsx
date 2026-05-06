"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PricingTable } from "@/components/billing/pricing-table";
import { supabase } from "@/lib/supabase/client";

const PLACEHOLDER_ORG_ID = "00000000-0000-0000-0000-000000000000";

export function PricingTableClient() {
  const searchParams = useSearchParams();
  const affiliateCode = searchParams.get("ref") || undefined;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orgId, setOrgId] = useState(PLACEHOLDER_ORG_ID);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();
        if (org) setOrgId(org.id);
      }
    }
    checkAuth();
  }, []);

  return (
    <PricingTable 
      orgId={orgId}
      affiliateCode={affiliateCode}
      requiresLogin={!isAuthenticated}
    />
  );
}
