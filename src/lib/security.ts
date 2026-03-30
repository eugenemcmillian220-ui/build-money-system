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
}

const defaultConfig: SecurityConfig = {
  enableRateLimiting: true,
  maxRequestsPerMinute: 60,
  blockedKeywords: ['system-prompt-leak', 'exec(', 'eval(', 'process.env'],
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
   * Simple rate limiting simulation
   * @param identifier User ID or IP address
   * @throws SecurityError if rate limit is exceeded
   */
  public checkRateLimit(identifier: string): void {
    if (!this.config.enableRateLimiting) return;

    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const userStats = this.requestCounts.get(identifier) || { count: 0, lastReset: now };

    if (now - userStats.lastReset > windowMs) {
      userStats.count = 1;
      userStats.lastReset = now;
    } else {
      userStats.count++;
    }

    this.requestCounts.set(identifier, userStats);

    if (userStats.count > this.config.maxRequestsPerMinute) {
      throw new SecurityError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
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
