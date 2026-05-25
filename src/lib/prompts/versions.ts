// src/lib/prompts/versions.ts
// Prompt versioning with A/B routing

import 'server-only';
import { createClient as createSvcClient } from '@supabase/supabase-js';

type PromptVariant = 'v1' | 'v2';

const PROMPTS: Record<string, Record<PromptVariant, string>> = {
  'pipeline-spec-analysis': {
    v1: `You are a senior product analyst. Extract core requirements from the spec.`,
    v2: `You are a senior product analyst with 10 years of SaaS experience. Your analysis is precise, structured, and immediately actionable. Extract and validate core requirements from the spec — flag any ambiguities or missing information.`,
  },
  'pipeline-market-research': {
    v1: `You are a market research analyst. Identify competitors and positioning.`,
    v2: `You are a market intelligence analyst. Produce structured, evidence-backed competitive analysis. Every claim must be specific — no generic observations.`,
  },
};

export function getPrompt(name: string, variant: PromptVariant = 'v1'): string {
  return PROMPTS[name]?.[variant] ?? PROMPTS[name]?.['v1'] ?? `You are a helpful AI assistant.`;
}

function getSupabase() {
  return createSvcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function trackPromptConversion(
  promptName: string,
  version: PromptVariant,
  userId: string,
  converted: boolean,
): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('prompt_ab_results').insert({
    prompt_name: promptName,
    version,
    user_id: userId,
    converted,
  });
}
