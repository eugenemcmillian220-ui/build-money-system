"use client";

import { useState, useCallback } from "react";
import { ManifestOptions } from "@/lib/types";

interface UseManifestationProps {
  onSuccess?: (projectId: string) => void;
  onError?: (error: string) => void;
}

export function useManifestation({ onSuccess, onError }: UseManifestationProps = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const pollStatus = useCallback(async (jobId: string, onLog: (level: "info" | "error", text: string) => void) => {
    let completed = false;
    let lastLogCount = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 300; // ~10 minutes

    while (!completed && attempts < MAX_ATTEMPTS) {
      attempts++;
      await new Promise((r) => setTimeout(r, 2000));

      try {
        const statusRes = await fetch(`/api/manifest/status?id=${jobId}`);
        if (!statusRes.ok) {
          if (statusRes.status === 404) break;
          continue;
        }

        const data = await statusRes.json();

        // Stream new logs
        if (data.logs && data.logs.length > lastLogCount) {
          for (let i = lastLogCount; i < data.logs.length; i++) {
            const l = data.logs[i];
            onLog(l.level === "error" ? "error" : "info", l.text || l.message);
          }
          lastLogCount = data.logs.length;
        }

        if (data.status === "complete") {
          completed = true;
          setIsProcessing(false);
          if (onSuccess) onSuccess(data.project_id);
          return;
        } else if (data.status === "error") {
          completed = true;
          setIsProcessing(false);
          const errorMsg = data.error || "Manifestation failed at neural level.";
          if (onError) onError(errorMsg);
          return;
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }

    if (!completed) {
      setIsProcessing(false);
      if (onError) onError("Manifestation is taking longer than expected. Please check back in a few minutes.");
    }
  }, [onSuccess, onError]);

  const startManifestation = useCallback(async (
    prompt: string,
    orgId: string,
    options: ManifestOptions,
    onLog: (level: "info" | "error", text: string) => void
  ) => {
    setIsProcessing(true);
    onLog("info", "Initiating manifestation pipeline...");

    try {
      const res = await fetch("/api/manifest/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, orgId, options }),
      });

      if (!res.ok) {
        const raw = await res.text();
        let message = raw;
        try {
          const parsed = JSON.parse(raw);
          message = parsed?.error || raw;
        } catch {
          message = res.status === 504 || /timeout/i.test(raw)
            ? `Manifestation timed out (${res.status}). The pipeline is still running on the server.`
            : `${res.status} ${res.statusText}: ${raw.slice(0, 200)}`;
        }
        throw new Error(message);
      }

      const { jobId } = await res.json();
      setCurrentJobId(jobId);
      onLog("info", `Job started: ${jobId.slice(0, 8)}. Awaiting synchronization...`);

      // Start polling
      pollStatus(jobId, onLog);
    } catch (err) {
      setIsProcessing(false);
      const errorMsg = err instanceof Error ? err.message : String(err);
      onLog("error", errorMsg);
      if (onError) onError(errorMsg);
    }
  }, [pollStatus, onError]);

  return {
    isProcessing,
    currentJobId,
    startManifestation,
  };
}
