export interface PulseEvent {
  name: string;
  properties?: Record<string, unknown>;
  url?: string;
  sessionId?: string;
}

export class SovereignPulse {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Ingest a telemetry event
   */
  async track(event: PulseEvent): Promise<void> {
    try {
      await fetch("/api/pulse/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: this.projectId,
          ...event,
        }),
      });
    } catch (err) {
      console.error("[PULSE] Ingestion failed:", err);
    }
  }
}

// Default instance for the platform itself
export const platformPulse = new SovereignPulse("00000000-0000-0000-0000-000000000000");
