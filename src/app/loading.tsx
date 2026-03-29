export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-current border-t-transparent opacity-60"
          role="status"
          aria-label="Loading"
        />
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Loading…
        </p>
      </div>
    </div>
  );
}
