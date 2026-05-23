import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: ApiError | null;
};

export function ok<T>(data: T, status = 200): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ success: true, data, error: null }, { status });
}

export function fail(code: string, message: string, status = 500, details?: unknown): NextResponse<ApiEnvelope<null>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    },
    { status },
  );
}
