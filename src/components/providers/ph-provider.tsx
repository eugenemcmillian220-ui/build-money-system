"use client";

import { PostHogProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import type { PostHog } from "posthog-js";

export function PHProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<PostHog | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initPostHog() {
      if (typeof window === "undefined") return;

      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

      if (!key || !host) return;

      const { default: posthog } = await import("posthog-js");
      posthog.init(key, {
        api_host: host,
        capture_pageview: false,
        capture_pageleave: true,
      });

      if (mounted) {
        setClient(posthog);
      }
    }

    initPostHog().catch(() => {
      if (mounted) {
        setClient(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!client) {
    return <>{children}</>;
  }

  return <PostHogProvider client={client}>{children}</PostHogProvider>;
}
