import { trace, SpanStatusCode } from "@opentelemetry/api";

export interface Span {
  name: string;
  startTime: number;
  attributes: Record<string, string | number | boolean>;
  end: (error?: Error) => void;
}

export function startSpan(
  name: string,
  attributes: Record<string, string | number | boolean> = {}
): Span {
  const tracer = trace.getTracer("sovereign-forge-os");
  const otelSpan = tracer.startSpan(name, { attributes });
  const startTime = Date.now();

  return {
    name,
    startTime,
    attributes,
    end(error?: Error) {
      if (error) {
        otelSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        otelSpan.recordException(error);
      } else {
        otelSpan.setStatus({ code: SpanStatusCode.OK });
      }
      
      const duration = Date.now() - startTime;
      if (process.env.NODE_ENV === "development") {
        if (error) {
          console.error(`[trace] ${name} FAILED in ${duration}ms:`, error.message);
        } else {
          console.log(`[trace] ${name} completed in ${duration}ms`, attributes);
        }
      }
      
      otelSpan.end();
    },
  };
}

/**
 * Wrap an async function with a trace span
 */
export async function traced<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = startSpan(name, attributes);
  try {
    const result = await fn(span);
    span.end();
    return result;
  } catch (error) {
    span.end(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
