export class CircuitBreaker {
  private failures = 0
  private lastFailureAt = 0

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
  ) {}

  canExecute(now = Date.now()): boolean {
    if (this.failures < this.threshold) return true
    return now - this.lastFailureAt > this.cooldownMs
  }

  recordSuccess(): void {
    this.failures = 0
    this.lastFailureAt = 0
  }

  recordFailure(now = Date.now()): void {
    this.failures += 1
    this.lastFailureAt = now
  }
}
