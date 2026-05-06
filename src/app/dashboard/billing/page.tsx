"use client";

import { useEffect, useState } from "react";
import { PricingTable } from "@/components/billing/pricing-table";
import { supabase } from "@/lib/supabase/client";
import { repairOrganization } from "@/lib/auth-actions";
import { Loader2 } from "lucide-react";

interface Org {
  id: string;
  billing_tier?: string;
  credit_balance?: number;
}

export default function BillingPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrg() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setOrg(data);
        setLoading(false);
        return;
      }

      // No org found — auto-create via server action
      await repairOrganization();
      const { data: retryData } = await supabase
        .from("organizations")
        .select("*")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();
      setOrg(retryData);
      setLoading(false);
    }
    fetchOrg();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
          <header>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">Empire Economy</h1>
            <p className="text-muted-foreground font-bold italic">Manage your neural credits and sovereign tier.</p>
          </header>

          <PricingTable 
            orgId={org?.id || "00000000-0000-0000-0000-000000000000"} 
            currentTier={org?.billing_tier}
          />
        </div>
    </div>
  );
}
