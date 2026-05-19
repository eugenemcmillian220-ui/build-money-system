export type Agent = { systemPrompt: string; buildPrompt: (spec: Record<string, unknown>, outputs: string[]) => string };
export type Phase = { name: string; agents: Agent[] };

export const PIPELINE_PHASES: Phase[] = Array.from({ length: 25 }, (_, i) => ({
  name: `phase-${i + 1}`,
  agents: [{
    systemPrompt: `You are Sovereign Forge agent for phase ${i + 1}.`,
    buildPrompt: (spec) => `Process this spec for phase ${i + 1}: ${JSON.stringify(spec)}`,
  }],
}));
