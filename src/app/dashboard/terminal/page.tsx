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

interface StatusLog {
  ts: string;
  level: "info" | "warn" | "error";
  text: string;
}

interface StatusResponse {
  id: string;
  status: "pending" | "running" | "complete" | "error";
  current_stage: string;
  logs: StatusLog[];
  project_id: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 600; // 15 min ceiling

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

  const handleManifest = async (
    prompt: string,
    options: ManifestOptions,
    onLog: (level: "info" | "error", text: string) => void,
  ) => {
    if (!org) throw new Error("Organization not loaded");

    const startRes = await fetch("/api/manifest/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, orgId: org.id, options }),
    });
    if (!startRes.ok) {
      const raw = await startRes.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed?.error || raw;
      } catch {
        message = `${startRes.status} ${startRes.statusText}: ${raw.slice(0, 200)}`;
      }
      throw new Error(message);
    }
    const { jobId } = (await startRes.json()) as { jobId: string };
    onLog("info", `Manifestation queued (job ${jobId.slice(0, 8)}). Polling for progress...`);

    let lastLogCount = 0;
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      attempts += 1;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await fetch(`/api/manifest/status?id=${encodeURIComponent(jobId)}`);
      if (!statusRes.ok) {
        onLog("error", `Status poll failed: ${statusRes.status}`);
        continue;
      }
      const status = (await statusRes.json()) as StatusResponse;
      const newLogs = status.logs.slice(lastLogCount);
      for (const log of newLogs) {
        onLog(log.level === "error" ? "error" : "info", log.text);
      }
      lastLogCount = status.logs.length;

      if (status.status === "complete") return;
      if (status.status === "error") {
        throw new Error(status.error || "Manifestation failed");
      }
    }
    throw new Error("Manifestation timed out while polling.");
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
