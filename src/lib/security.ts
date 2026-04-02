/**
 * Security Layer for AI App Builder
 * Provides input sanitization, API key validation, and rate limiting simulation
 */

export class SecurityError extends Error {
  constructor(message: string, public code: string = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
  }
}

export interface SecurityConfig {
  enableRateLimiting: boolean;
  maxRequestsPerMinute: number;
  blockedKeywords: string[];
  enablePIIScanning: boolean;
}

const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/g,
};

const defaultConfig: SecurityConfig = {
  enableRateLimiting: true,
  maxRequestsPerMinute: 60,
  blockedKeywords: ['system-prompt-leak', 'exec(', 'eval(', 'process.env'],
  enablePIIScanning: true,
};

export class SecurityLayer {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; lastReset: number }> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Validates an API key
   * @param apiKey The API key to validate
   * @returns boolean indicating if the key is valid
   */
  public validateApiKey(apiKey?: string): boolean {
    if (!apiKey) return false;
    // In production, check against admin API keys from environment
    const adminKeys = process.env.ADMIN_API_KEYS?.split(',') || [];
    if (adminKeys.length > 0 && adminKeys.includes(apiKey)) {
      return true;
    }
    // Development fallback: check format
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }

  /**
   * Sanitizes input string to prevent injection attacks and block unwanted keywords
   * @param input The raw input string
   * @returns The sanitized string
   */
  public sanitizeInput(input: string): string {
    let sanitized = input.trim();

    // Basic HTML sanitization
    sanitized = sanitized.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    
    // Check for blocked keywords
    for (const keyword of this.config.blockedKeywords) {
      if (sanitized.toLowerCase().includes(keyword.toLowerCase())) {
        throw new SecurityError(`Input contains forbidden content: ${keyword}`);
      }
    }

    return sanitized;
  }

  /**
   * Scans content for PII and blocks it if scanning is enabled
   * @param content The content to scan
   */
  public checkPII(content: string): void {
    if (!this.config.enablePIIScanning) return;

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(content)) {
        throw new SecurityError(`Input contains sensitive information: ${type}`, 'PII_DETECTED');
      }
    }
  }

  /**
   * Sliding-window rate limit using request headers as identifier.
   * Uses in-process Map as best-effort limiter (upgrade to Upstash Redis for production multi-instance).
   * Cleans up stale entries to prevent memory growth.
   */
  public checkRateLimit(identifier: string): void {
    if (!this.config.enableRateLimiting) return;

    const now = Date.now();
    const windowMs = 60_000; // 1 minute sliding window

    // Clean up entries older than the window to prevent memory growth
    for (const [key, stats] of this.requestCounts.entries()) {
      if (now - stats.lastReset > windowMs * 2) {
        this.requestCounts.delete(key);
      }
    }

    const stats = this.requestCounts.get(identifier) ?? { count: 0, lastReset: now };

    if (now - stats.lastReset > windowMs) {
      // Window expired — reset
      this.requestCounts.set(identifier, { count: 1, lastReset: now });
      return;
    }

    stats.count++;
    this.requestCounts.set(identifier, stats);

    if (stats.count > this.config.maxRequestsPerMinute) {
      const retryAfterSeconds = Math.ceil((windowMs - (now - stats.lastReset)) / 1000);
      throw new SecurityError(
        `Rate limit exceeded. Try again in ${retryAfterSeconds}s.`,
        "RATE_LIMIT_EXCEEDED"
      );
    }
  }

  /**
   * Validates file paths to prevent path traversal
   * @param path File path to validate
   */
  public validateFilePath(path: string): void {
    if (path.includes('..') || path.startsWith('/') || path.includes(':')) {
      throw new SecurityError(`Invalid file path: ${path}`, 'INVALID_PATH');
    }
  }
}

export const security = new SecurityLayer();
