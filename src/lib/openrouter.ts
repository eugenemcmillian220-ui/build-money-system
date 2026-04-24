import { llmRouter } from "./llm-router";
import { ChatMessage } from "./types";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "OpenRouterError";
  }
}

export async function generateText(prompt: string): Promise<string> {
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  const result = await llmRouter.executeWithFailover(messages);
  return result.content;
}

export async function generateTextStream(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const result = await generateText(prompt);
  const encoder = new TextEncoder();
  
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(result));
      controller.close();
    },
  });
}

export interface MultiFileResponse {
  files: Record<string, string>;
  description?: string;
  schema?: string;
  integrations?: string[];
}

import { cleanJson } from "./llm";

export async function generateMultiFileApp(prompt: string): Promise<MultiFileResponse> {
  const content = await generateText(prompt);
  return JSON.parse(cleanJson(content));
}

export async function generateEmbedding(text: string, dim = 1536): Promise<number[]> {
  const vec = new Array<number>(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % dim] = (vec[i % dim] + text.charCodeAt(i)) % 997;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}
