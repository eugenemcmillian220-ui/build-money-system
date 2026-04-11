"use client";

import { useEffect, useState } from "react";
import { AiTerminal } from "@/components/dashboard/AiTerminal";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface Org {
  id: string;
}

interface ManifestOptions {
  mode?: string;
  protocol?: string;
  theme?: string;
  primaryColor?: string;
}

export default function TerminalPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrg() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("organizations")
          .select("*")
          .eq("owner_id", user.id)
          .single();
        setOrg(data);
      }
      setLoading(false);
    }
    fetchOrg();
  }, []);

  const handleManifest = async (prompt: string, options: ManifestOptions) => {
    if (!org) throw new Error("Organization not loaded");
    const res = await fetch("/api/manifest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, orgId: org.id, options }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Manifestation failed");
    }
  };

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
            <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-2">Neural Terminal</h1>
            <p className="text-muted-foreground font-bold italic">Direct command interface for project manifestation.</p>
          </header>

          <div className="max-w-4xl">
            <AiTerminal onManifest={handleManifest} orgId={org?.id} />
          </div>
        </div>
    </div>
  );
}
