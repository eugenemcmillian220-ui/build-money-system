import { callLLMJson } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { traced } from "@/lib/telemetry";
// ChatMessage import removed as it is unused.

export interface AgentConfig {
  name: string;
  role: string;
  temperature?: number;
}

export interface AgentContext<TInput, TOutput> {
  config: AgentConfig;
  schema: { parse: (data: unknown) => TOutput };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildMessages: (input: TInput) => any[];
  fallback: TOutput;
}

export async function runStandardAgent<TInput, TOutput>(
  context: AgentContext<TInput, TOutput>,
  input: TInput
): Promise<TOutput> {
  const { config, schema, buildMessages, fallback } = context;

  return traced(
    `agent.${config.name.toLowerCase()}`,
    { "agent.role": config.role },
    async () => {
      try {
        const messages = buildMessages(input);
        const result = await callLLMJson(messages, schema, {
          temperature: config.temperature ?? 0.3,
        });
        return result;
      } catch (err) {
        logger.warn(`${config.name} agent failed (non-fatal)`, {
          error: (err as Error).message,
        });
        return fallback;
      }
    }
  );
}
