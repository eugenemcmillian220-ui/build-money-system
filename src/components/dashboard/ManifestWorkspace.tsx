"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AiTerminal } from "./AiTerminal";
import { LiveCodePanel } from "./LiveCodePanel";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ManifestOptions } from "@/lib/types";

interface ManifestWorkspaceProps {
  orgId?: string;
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
  files?: Record<string, string>;
  spec?: { name?: string; featureCount?: number };
}

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 600;

export function ManifestWorkspace({ orgId }: ManifestWorkspaceProps) {
  const [files, setFiles] = useState<Record<string, string> | null>(null);
  const [currentStage, setCurrentStage] = useState("idle");
  const [spec, setSpec] = useState<{ name?: string; featureCount?: number } | null>(null);
  const [codeExpanded, setCodeExpanded] = useState(true);
  const pollingRef = useRef(false);

  const pollForFiles = useCallback(async (
    jobId: string,
    onLog: (level: "info" | "error", text: string) => void,
  ) => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    let lastLogCount = 0;
    let attempts = 0;

    while (pollingRef.current && attempts < MAX_POLL_ATTEMPTS) {
      attempts += 1;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      try {
        const statusRes = await fetch(`/api/manifest/status?id=${encodeURIComponent(jobId)}`);
        if (!statusRes.ok) {
          if (statusRes.status === 404) break;
          continue;
        }

        const data: StatusResponse = await statusRes.json();

        setCurrentStage(data.current_stage);

        if (data.spec) {
          setSpec(data.spec);
        }

        if (data.files && Object.keys(data.files).length > 0) {
          setFiles(data.files);
        }

        const newLogs = data.logs.slice(lastLogCount);
        for (const log of newLogs) {
          onLog(log.level === "error" ? "error" : "info", log.text);
        }
        lastLogCount = data.logs.length;

        if (data.status === "complete" || data.status === "error") {
          pollingRef.current = false;
          return;
        }
      } catch {
        // Transient polling error — continue
      }
    }

    pollingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      pollingRef.current = false;
    };
  }, []);

  const handleManifest = useCallback(async (
    prompt: string,
    options: ManifestOptions,
    onLog: (level: "info" | "error", text: string) => void,
  ) => {
    if (!orgId) throw new Error("Organization not loaded");

    setFiles(null);
    setSpec(null);
    setCurrentStage("queued");
    setCodeExpanded(true);

    const startRes = await fetch("/api/manifest/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, orgId, options }),
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

    await pollForFiles(jobId, onLog);
  }, [orgId, pollForFiles]);

  return (
    <div className="space-y-4">
      {/* Toggle button */}
      <div className="flex justify-end">
        <button
          onClick={() => setCodeExpanded(!codeExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/10 transition-all"
        >
          {codeExpanded ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          {codeExpanded ? "Hide Code View" : "Show Code View"}
        </button>
      </div>

      {/* Split layout */}
      <div className={`grid gap-4 ${codeExpanded ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-4xl"}`}>
        {/* Terminal panel */}
        <div>
          <AiTerminal onManifest={handleManifest} orgId={orgId} />
        </div>

        {/* Code panel */}
        {codeExpanded && (
          <div className="h-[500px]">
            <LiveCodePanel
              files={files}
              currentStage={currentStage}
              spec={spec}
            />
          </div>
        )}
      </div>
    </div>
  );
}
