/**
 * Security Layer for AI App Builder
 * Provides input sanitization, API key validation, rate limiting, and prompt injection detection
 */

export class SecurityError extends Error {
  constructor(message: string, public code: string = "SECURITY_ERROR") {
    super(message);
    this.name = "SecurityError";
  }
}

export interface SecurityConfig {
  enableRateLimiting: boolean;
  maxRequestsPerMinute: number;
  blockedKeywords: string[];
  enablePIIScanning: boolean;
  enablePromptInjectionDetection: boolean;
}

const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/,
};

/**
 * Structural prompt injection patterns.
 * These detect role-switching, instruction overriding, and context manipulation
 * attempts that a simple keyword blocklist would miss.
 */
const INJECTION_PATTERNS: { pattern: RegExp; description: string }[] = [
  // Role switching / identity override
  { pattern: /\b(you are now|act as|pretend to be|assume the role|new personality)\b/i, description: "role-switching attempt" },
  { pattern: /\b(ignore (all )?previous|disregard (all )?(prior|above)|forget (your|all|the) instructions)\b/i, description: "instruction override attempt" },
  { pattern: /\b(system prompt|system message|initial prompt|original instructions)\b/i, description: "system prompt extraction attempt" },
  
  // Delimiter injection (trying to break out of user message context)
  { pattern: /\[\/?INST\]/i, description: "instruction delimiter injection" },
  { pattern: /<\|?(system|assistant|im_start|im_end)\|?>/i, description: "chat template injection" },
  { pattern: /```system\b/i, description: "system block injection" },
  
  // Code execution / environment access
  { pattern: /\b(exec|eval)\s*\(/i, description: "code execution attempt" },
  { pattern: /\bprocess\.env\b/i, description: "environment variable access attempt" },
  { pattern: /\brequire\s*\(\s*[\'\"](child_process|fs|os|net)/i, description: "dangerous module import" },
  
  // Data exfiltration
  { pattern: /\b(fetch|XMLHttpRequest|sendBeacon)\s*\(/i, description: "data exfiltration attempt" },
  { pattern: /\b(curl|wget|nc )\s/i, description: "network command injection" },
];

const defaultConfig: SecurityConfig = {
  enableRateLimiting: true,
  maxRequestsPerMinute: 60,
  blockedKeywords: ["system-prompt-leak"],
  enablePIIScanning: true,
  enablePromptInjectionDetection: true,
};

export class SecurityLayer {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; lastReset: number }> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Validates an API key against the ADMIN_API_KEYS environment variable.
   * Returns false if no admin keys are configured (fail-closed in production).
   */
  public validateApiKey(apiKey?: string): boolean {
    if (!apiKey) return false;

    const adminKeys = process.env.ADMIN_API_KEYS?.split(",").map((k) => k.trim()).filter(Boolean) || [];

    // Fail-closed: if no admin keys configured, reject all API key auth
    if (adminKeys.length === 0) {
      console.warn("[Security] ADMIN_API_KEYS not configured — API key auth disabled");
      return false;
    }

    return adminKeys.includes(apiKey);
  }

  /**
   * Sanitizes input string to prevent injection attacks.
   * Checks structural prompt injection patterns + keyword blocklist.
   */
  public sanitizeInput(input: string): string {
    let sanitized = input.trim();

    // HTML sanitization
    sanitized = sanitized.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");

    // Structural prompt injection detection
    if (this.config.enablePromptInjectionDetection) {
      for (const { pattern, description } of INJECTION_PATTERNS) {
        if (pattern.test(sanitized)) {
          throw new SecurityError(
            `Input blocked: ${description}`,
            "PROMPT_INJECTION_DETECTED"
          );
        }
      }
    }

    // Keyword blocklist (custom additions)
    for (const keyword of this.config.blockedKeywords) {
      if (sanitized.toLowerCase().includes(keyword.toLowerCase())) {
        throw new SecurityError(`Input contains forbidden content: ${keyword}`);
      }
    }

    return sanitized;
  }

  /**
   * Scans content for PII and blocks it if scanning is enabled
   */
  public checkPII(content: string): void {
    if (!this.config.enablePIIScanning) return;

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(content)) {
        throw new SecurityError(`Input contains sensitive information: ${type}`, "PII_DETECTED");
      }
    }
  }

  /**
   * Sliding-window rate limit.
   * Uses in-process Map as best-effort limiter (upgrade to Upstash Redis for production multi-instance).
   */
  public checkRateLimit(identifier: string): void {
    if (!this.config.enableRateLimiting) return;

    const now = Date.now();
    const windowMs = 60_000;

    // Cleanup stale entries
    for (const [key, stats] of this.requestCounts.entries()) {
      if (now - stats.lastReset > windowMs * 2) {
        this.requestCounts.delete(key);
      }
    }

    const stats = this.requestCounts.get(identifier) ?? { count: 0, lastReset: now };

    if (now - stats.lastReset > windowMs) {
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
   */
  public validateFilePath(path: string): void {
    if (path.includes("..") || path.startsWith("/") || path.includes(":")) {
      throw new SecurityError(`Invalid file path: ${path}`, "INVALID_PATH");
    }
  }
}

export const security = new SecurityLayer();
