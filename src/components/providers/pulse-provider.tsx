"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { platformPulse } from "@/lib/pulse";

const PulseContext = createContext<{
  track: (name: string, properties?: Record<string, unknown>) => void;
  trackError: (error: Error, metadata?: Record<string, unknown>) => void;
} | null>(null);

export function PulseProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sessionId = useRef<string>(Math.random().toString(36).substring(7));

  // Initialize tracking
  useEffect(() => {
    // 1. Capture unhandled errors (Sentry-style)
    const handleError = (event: ErrorEvent) => {
      platformPulse.track({
        name: "error",
        url: window.location.href,
        sessionId: sessionId.current,
        properties: {
          message: event.message,
          type: event.error?.name || "Error",
          stack: event.error?.stack || "",
          filename: event.filename,
          lineno: event.lineno,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      platformPulse.track({
        name: "error",
        url: window.location.href,
        sessionId: sessionId.current,
        properties: {
          message: event.reason?.message || "Unhandled Promise Rejection",
          type: "UnhandledRejection",
          stack: event.reason?.stack || "",
        },
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  // 2. Track page views (PostHog-style)
  useEffect(() => {
    platformPulse.track({
      name: "page_view",
      url: window.location.href,
      sessionId: sessionId.current,
      properties: {
        path: pathname,
        referrer: document.referrer,
      },
    });
  }, [pathname]);

  const track = (name: string, properties?: Record<string, unknown>) => {
    platformPulse.track({
      name,
      url: window.location.href,
      sessionId: sessionId.current,
      properties,
    });
  };

  const trackError = (error: Error, metadata?: Record<string, unknown>) => {
    platformPulse.track({
      name: "error",
      url: window.location.href,
      sessionId: sessionId.current,
      properties: {
        message: error.message,
        type: error.name,
        stack: error.stack,
        ...metadata,
      },
    });
  };

  return (
    <PulseContext.Provider value={{ track, trackError }}>
      {children}
    </PulseContext.Provider>
  );
}

export function usePulse() {
  const context = useContext(PulseContext);
  if (!context) {
    throw new Error("usePulse must be used within a PulseProvider");
  }
  return context;
}
