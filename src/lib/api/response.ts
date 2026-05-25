// src/lib/api/response.ts
// Standardised API response factory

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { AppError, ErrorCode, ERROR_META } from '../error-codes';

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

// Legacy alias
export const ok = apiSuccess;

export function apiError(
  code: ErrorCode | string,
  message?: string,
  status?: number,
  details?: unknown,
): NextResponse {
  // Handle both new (ErrorCode enum) and legacy (string) usage
  if (typeof code === 'string' && !(code in ErrorCode) && !Object.values(ErrorCode).includes(code as ErrorCode)) {
    return NextResponse.json(
      { error: { code, message: message ?? 'An error occurred', details } },
      { status: status ?? 500 },
    );
  }
  const enumCode = code as ErrorCode;
  const meta = ERROR_META[enumCode];
  return NextResponse.json(
    { error: { code, message: message ?? meta?.userMessage ?? 'An error occurred', details } },
    { status: status ?? meta?.httpStatus ?? 500 },
  );
}

// Legacy alias
export const fail = apiError;

export function zodErrorToApiError(err: ZodError): NextResponse {
  return apiError(ErrorCode.INVALID_INPUT, 'Validation failed', 422, err.flatten().fieldErrors);
}

export function appErrorToApiError(err: AppError): NextResponse {
  return apiError(err.code, err.message, err.httpStatus, err.details);
}

export function unknownErrorToApiError(err: unknown, context?: string): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  Sentry.captureException(err, { extra: { context } });
  console.error(`[api] unhandled error${context ? ` in ${context}` : ''}:`, message);
  return apiError(ErrorCode.INTERNAL_ERROR);
}

/** Wraps an API route handler with global error handling */
export function withErrorHandler(
  handler: (req: Request, ctx: unknown) => Promise<NextResponse>,
) {
  return async (req: Request, ctx: unknown): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) return appErrorToApiError(err);
      if (err instanceof ZodError) return zodErrorToApiError(err);
      return unknownErrorToApiError(err, (req as Request).url);
    }
  };
}
