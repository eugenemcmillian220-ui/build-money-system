"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-8">
      <h1 className="text-4xl font-bold">Sentry Example Page</h1>
      <p className="text-lg text-muted-foreground">
        Click the button below to trigger a test error and verify your Sentry setup.
      </p>
      <button
        type="button"
        className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
        onClick={() => {
          Sentry.captureException(new Error("Sentry Test Error from Example Page"));
          alert("Error captured and sent to Sentry!");
        }}
      >
        Trigger Test Error
      </button>
    </div>
  );
}
