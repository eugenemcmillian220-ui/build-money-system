// Mock for 'server-only' package in test environments.
// The real package throws if imported outside Next.js server context.
// This no-op mock allows tsx-based tests to import server-side modules safely.
export {};
