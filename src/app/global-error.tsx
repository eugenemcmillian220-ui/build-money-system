"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
          <h2 className="text-2xl font-bold mb-4 text-amber-500 underline decoration-amber-500/50 underline-offset-8">
            SYSTEM_CRITICAL_FAILURE
          </h2>
          <p className="text-gray-400 mb-8 max-w-md text-center">
            The Sovereign Forge OS has encountered a fatal neural bridge error.
            Recovery protocols initiated.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 transition-colors rounded text-black font-semibold uppercase tracking-widest"
          >
            RESTORE_CONNECTION
          </button>
        </div>
      </body>
    </html>
  );
}
