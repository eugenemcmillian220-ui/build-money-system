// src/lib/error-codes.ts
// Centralised error taxonomy

export enum ErrorCode {
  // Auth (1xxx)
  NOT_AUTHENTICATED  = 'AUTH_1001',
  FORBIDDEN          = 'AUTH_1002',
  SESSION_EXPIRED    = 'AUTH_1003',
  // Billing (2xxx)
  INSUFFICIENT_CREDITS   = 'BILLING_2001',
  PAYMENT_FAILED         = 'BILLING_2002',
  SUBSCRIPTION_REQUIRED  = 'BILLING_2003',
  // Pipeline (3xxx)
  PIPELINE_FAILED   = 'PIPELINE_3001',
  PHASE_TIMEOUT     = 'PIPELINE_3002',
  INVALID_SPEC      = 'PIPELINE_3003',
  // Validation (4xxx)
  INVALID_INPUT          = 'VALIDATION_4001',
  MISSING_REQUIRED_FIELD = 'VALIDATION_4002',
  // Rate limit (5xxx)
  RATE_LIMIT_EXCEEDED = 'RATE_5001',
  // System (9xxx)
  INTERNAL_ERROR      = 'SYSTEM_9001',
  SERVICE_UNAVAILABLE = 'SYSTEM_9002',
}

// Backward-compatible aliases
export const ERROR_CODES = ErrorCode;

interface ErrorMeta {
  httpStatus: number;
  userMessage: string;
  retryable: boolean;
}

export const ERROR_META: Record<ErrorCode, ErrorMeta> = {
  [ErrorCode.NOT_AUTHENTICATED]:      { httpStatus: 401, userMessage: 'Please sign in to continue.',                  retryable: false },
  [ErrorCode.FORBIDDEN]:              { httpStatus: 403, userMessage: "You don't have permission to do that.",        retryable: false },
  [ErrorCode.SESSION_EXPIRED]:        { httpStatus: 401, userMessage: 'Your session expired. Please sign in again.',  retryable: false },
  [ErrorCode.INSUFFICIENT_CREDITS]:   { httpStatus: 402, userMessage: 'Not enough credits. Top up to continue.',      retryable: false },
  [ErrorCode.PAYMENT_FAILED]:         { httpStatus: 402, userMessage: 'Payment failed. Please update your card.',     retryable: true  },
  [ErrorCode.SUBSCRIPTION_REQUIRED]:  { httpStatus: 402, userMessage: 'This feature requires a paid plan.',           retryable: false },
  [ErrorCode.PIPELINE_FAILED]:        { httpStatus: 500, userMessage: 'The pipeline encountered an error.',           retryable: true  },
  [ErrorCode.PHASE_TIMEOUT]:          { httpStatus: 504, userMessage: 'A pipeline phase timed out.',                  retryable: true  },
  [ErrorCode.INVALID_SPEC]:           { httpStatus: 422, userMessage: 'The spec is incomplete or contradictory.',     retryable: false },
  [ErrorCode.INVALID_INPUT]:          { httpStatus: 422, userMessage: 'The request contains invalid data.',           retryable: false },
  [ErrorCode.MISSING_REQUIRED_FIELD]: { httpStatus: 422, userMessage: 'A required field is missing.',                 retryable: false },
  [ErrorCode.RATE_LIMIT_EXCEEDED]:    { httpStatus: 429, userMessage: 'Too many requests. Please slow down.',         retryable: true  },
  [ErrorCode.INTERNAL_ERROR]:         { httpStatus: 500, userMessage: 'Something went wrong on our end.',             retryable: true  },
  [ErrorCode.SERVICE_UNAVAILABLE]:    { httpStatus: 503, userMessage: 'Service temporarily unavailable.',             retryable: true  },
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly details?: unknown,
    cause?: unknown,
  ) {
    super(ERROR_META[code].userMessage, { cause });
    this.name = 'AppError';
  }
  get httpStatus() { return ERROR_META[this.code].httpStatus; }
  get retryable()  { return ERROR_META[this.code].retryable; }
}

// Legacy aliases used by existing routes
export const UNAUTHORIZED = ErrorCode.NOT_AUTHENTICATED;
export const VALIDATION_FAILED = ErrorCode.INVALID_INPUT;
