import "server-only";
import { traced } from "@/lib/telemetry";
import { Project } from "@/lib/types";
import { saveProjectDB } from "@/lib/supabase/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { monetizationEngine } from "@/lib/monetization";
import {
  appendLog,
  failManifestation,
  loadManifestation,
  setStage,
  type ManifestationRow,
} from "./store";

const AGENT_THROTTLE_MS = 500;
const throttle = () => new Promise((r) => setTimeout(r, AGENT_THROTTLE_MS));

async function loadAgents() {
  const [
    { classifyIntent },
    { runScoutAgent },
    { runArchitectAgent },
    { runDeveloperAgent },
    { runChroniclerAgent },
    { runPhantom },
    { runHerald },
    { runOverseerAgent },
    { PHASE_19_SYSTEM_PROMPT },
    { runSecurityAudit },
    { runSentinelAgent },
    { runEconomyAgent },
    { runBrokerAgent },
    { runLegalAgent },
  ] = await Promise.all([
    import("@/lib/agents/classifier"),
    import("@/lib/agents/scout"),
    import("@/lib/agents/architect"),
    import("@/lib/agents/developer"),
    import("@/lib/agents/chronicler"),
    import("@/lib/agents/phantom"),
    import("@/lib/agents/herald"),
    import("@/lib/agents/overseer"),
    import("@/lib/prompts/phase-19"),
    import("@/lib/agents/security"),
    import("@/lib/agents/sentinel"),
    import("@/lib/agents/economy"),
    import("@/lib/agents/broker"),
    import("@/lib/agents/legal"),
  ]);
  return {
    classifyIntent, runScoutAgent, runArchitectAgent, runDeveloperAgent, runChroniclerAgent,
    runPhantom, runHerald, runOverseerAgent, PHASE_19_SYSTEM_PROMPT,
    runSecurityAudit, runSentinelAgent, runEconomyAgent, runBrokerAgent, runLegalAgent,
  };
}

type StageState = Record<string, unknown>;

function mergeState(row: ManifestationRow, patch: StageState): StageState {
  return { ...(row.state ?? {}), ...patch };
}

export async function runIntentStage(jobId: string, baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "intent", { status: "running" }, "Decoding intent (Classifier + Scout + Architect)...");
    const agents = await loadAgents();
    const opts = (row.options ?? {}) as { mode?: string; protocol?: string; theme?: string; primaryColor?: string };

    const classification = await traced(
      "agent.classifier",
      { "agent.role": "Classifier" },
      () => agents.classifyIntent(row.prompt),
    );
    const mode = opts.mode || classification.mode;
    const protocol = opts.protocol || classification.protocol;
    await appendLog(jobId, "info", `Classifier complete. Mode=${mode} Protocol=${protocol}.`);

    const baseCost = mode === "elite" ? 100 : 50;
    const dynamicCost = monetizationEngine.calculateManifestationCost(baseCost);

    let creditsReserved = false;
    if (row.org_id) {
      const { data: reserved, error: reserveError } = await supabaseAdmin.rpc("reserve_credits", {
        p_org_id: row.org_id,
        p_amount: dynamicCost,
      });
      if (reserveError) throw new Error(`Credit reservation failed: ${reserveError.message}`);
      if (!reserved) {
        throw new Error(
          `Insufficient credits. Current cost (with ${monetizationEngine.getSurgeMultiplier()}x surge) is ${dynamicCost} neural units.`,
        );
      }
      creditsReserved = true;
      // Persist reservation BEFORE running subsequent agents. If Scout/Architect
      // (or anything else below) throws, failManifestation can then read
      // creditsReserved + dynamicCost from DB state and refund properly.
      await supabaseAdmin
        .from("manifestations")
        .update({
          state: { ...(row.state ?? {}), creditsReserved: true, dynamicCost },
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      await appendLog(jobId, "info", `Reserved ${dynamicCost} credits for manifestation.`);
    }

    await throttle();
    const strategy = await traced(
      "agent.scout",
      { "agent.role": "Scout" },
      () => agents.runScoutAgent(row.prompt, protocol),
    );
    await appendLog(jobId, "info", "Scout complete — strategy drafted.");

    await throttle();
    const architecture = await traced(
      "agent.architect",
      { "agent.role": "Architect" },
      () => agents.runArchitectAgent(row.prompt, strategy.strategyMarkdown),
    );
    await appendLog(jobId, "info", "Architect complete — blueprint locked.");

    const visualTokens = {
      theme: opts.theme || "dark",
      primaryColor: opts.primaryColor || "#f59e0b",
      fontFamily: "Inter, sans-serif",
    };

    const finalPrompt = `
${agents.PHASE_19_SYSTEM_PROMPT}

BUILD CONTEXT:
Mode: ${mode.toUpperCase()}
Protocol: ${protocol.toUpperCase()}
Visual Theme: ${visualTokens.theme} (Primary: ${visualTokens.primaryColor})

STRATEGY:
${strategy.strategyMarkdown}

ARCHITECTURE PLAN:
${architecture.coreLogicPlan}
FILE STRUCTURE: ${architecture.fileStructure.join(", ")}
DATABASE REQS: ${architecture.databaseRequirements.join(", ")}

USER REQUEST: "${row.prompt}"
`;

    const nextState = mergeState(row, {
      mode,
      protocol,
      dynamicCost,
      creditsReserved,
      strategyMarkdown: strategy.strategyMarkdown,
      architecture,
      visualTokens,
      finalPrompt,
    });

    await setStage(jobId, "intent", { state: nextState }, "Intent stage complete → queued generate.");
    void (baseUrl);
  } catch (err) {
    await failManifestation(jobId, `Intent stage failed: ${(err as Error).message}`);
    throw err;
  }
}

export async function runGenerateStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "generate", { status: "running" }, "Generating code (Developer agent)...");
    const state = row.state as StageState;
    const finalPrompt = state.finalPrompt as string;
    if (!finalPrompt) throw new Error("Intent stage did not produce finalPrompt.");

    const agents = await loadAgents();
    const result = await agents.runDeveloperAgent(finalPrompt, {
      mode: (state.mode as "web-app" | "mobile-app") || "web-app",
      multiFile: true,
      orgId: row.org_id ?? undefined,
    });

    const files = result.files;
    const projectName = (result.description || "Untitled").split("\n")[0].slice(0, 100);
    const projectDesc = result.description || row.prompt;

    const nextState = mergeState(row, {
      genData: result,
      files,
      projectName,
      projectDesc,
    });
    await setStage(jobId, "generate", { state: nextState }, `Developer complete — ${Object.keys(files || {}).length} files generated.`);
  } catch (err) {
    await failManifestation(jobId, `Generate stage failed: ${(err as Error).message}`);
    throw err;
  }
}

export async function runPolishStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "polish", { status: "running" }, "Running post-gen agents (Chronicler + Security + Economy + Legal + Herald)...");
    const agents = await loadAgents();
    const state = row.state as StageState;
    const files = state.files as Record<string, string>;
    const projectName = state.projectName as string;
    const projectDesc = state.projectDesc as string;
    const protocol = state.protocol as string;
    const mode = state.mode as string;
    const strategyMarkdown = state.strategyMarkdown as string;
    const genData = state.genData as Record<string, unknown>;
    const isElite = mode === "elite";

    await throttle();
    const [docs, security, economy, legal] = await Promise.all([
      traced("agent.chronicler", { "agent.role": "Chronicler" }, () => agents.runChroniclerAgent(files)),
      traced("agent.security", { "agent.role": "Security" }, () => agents.runSecurityAudit(files)),
      traced("agent.economy", { "agent.role": "Economy" }, () => agents.runEconomyAgent({
        name: projectName,
        description: projectDesc,
        manifest: { protocol },
      } as unknown as Project)),
      traced("agent.legal", { "agent.role": "Legal" }, () => agents.runLegalAgent({
        name: projectName,
        description: projectDesc,
        manifest: { protocol },
      } as unknown as Project)),
    ]);

    let sentinel: Awaited<ReturnType<typeof agents.runSentinelAgent>> | undefined;
    let simulation: Awaited<ReturnType<typeof agents.runPhantom>> | undefined;
    if (isElite) {
      await throttle();
      [sentinel, simulation] = await Promise.all([
        traced("agent.sentinel", { "agent.role": "Sentinel" }, () => agents.runSentinelAgent(files)),
        traced("agent.phantom", { "agent.role": "Phantom" }, () => agents.runPhantom({ files, id: "temp", createdAt: new Date().toISOString() } as Project)),
      ]);
    }

    await throttle();
    const launch = await traced("agent.herald", { "agent.role": "Herald" }, () => agents.runHerald({
      description: projectDesc,
      files,
      id: "temp",
      createdAt: new Date().toISOString(),
      manifest: { strategy: strategyMarkdown, docs: docs as unknown as Record<string, unknown>, mode, protocol },
    } as unknown as Project));

    let broker: {
      mergerPotential: { targetProjectId: string; compatibility: number; strategy: string }[];
      negotiationStrategy: string;
    } = {
      mergerPotential: [],
      negotiationStrategy: isElite ? "Audit pending (no organization linked)." : "Audit skipped (non-elite mode).",
    };
    let qaResult: { status?: string; testSteps?: { result?: string; error?: string; step?: string }[] } | null = null;
    if (isElite) {
      if (row.org_id) {
        await throttle();
        const { data: existingProjects } = await supabaseAdmin
          .from("projects")
          .select("*")
          .eq("org_id", row.org_id)
          .limit(10);
        broker = await traced("agent.broker", { "agent.role": "Broker" }, () => agents.runBrokerAgent({
          description: projectDesc,
          id: "temp",
        } as unknown as Project, existingProjects || []));
      }
      await throttle();
      qaResult = await traced("agent.overseer", { "agent.role": "Overseer" }, () => agents.runOverseerAgent({
        ...genData,
        files,
        id: "temp",
        createdAt: new Date().toISOString(),
        manifest: { strategy: strategyMarkdown, docs, mode, protocol },
      } as unknown as Project));
    }

    const nextState = mergeState(row, {
      docs,
      security,
      economy,
      legal,
      sentinel,
      simulation,
      launch,
      broker,
      qaResult,
    });
    await setStage(jobId, "polish", { state: nextState }, "Post-gen polish complete.");
  } catch (err) {
    await failManifestation(jobId, `Polish stage failed: ${(err as Error).message}`);
    throw err;
  }
}

export async function runPersistStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "persist", { status: "running" }, "Persisting empire to database...");
    const state = row.state as StageState;
    const files = state.files as Record<string, string>;
    const mode = state.mode as string;
    const protocol = state.protocol as string;
    const strategyMarkdown = state.strategyMarkdown as string;
    const visualTokens = state.visualTokens as { theme: "dark" | "light" | "system"; primaryColor: string; fontFamily: string };
    const docs = state.docs as Parameters<typeof saveProjectDB>[0]["manifest"] extends infer M ? (M extends { docs?: infer D } ? D : never) : never;
    const security = state.security as {
      score: number;
      recommendations: string[];
      vulnerabilities: { severity: "low" | "medium" | "high" | "critical"; type: string; description: string; file?: string; fix?: string }[];
    };
    const sentinel = state.sentinel as { vulnerabilitiesFixed: string[]; penetrationLog: string[]; hardeningScore: number } | undefined;
    const economy = state.economy as { agentRoi: number; stakingAvailable: boolean; suggestedStake: number; estimatedMonthlyRevenue: number } | undefined;
    const legal = state.legal as { patentDraft: string; tos: string; privacyPolicy: string; status: "drafted" | "filed" | "verified" } | undefined;
    const launch = state.launch as Parameters<typeof saveProjectDB>[0]["manifest"] extends infer M ? (M extends { launch?: infer L } ? L : never) : never;
    const simulation = state.simulation as { uxScore: number; frictionPoints: string[]; recommendations: string[] } | undefined;
    const broker = state.broker as { mergerPotential: { targetProjectId: string; compatibility: number; strategy: string }[]; negotiationStrategy: string };
    const qaResult = state.qaResult as {
      status?: string;
      testSteps?: { result?: string; error?: string; step?: string }[];
    } | null;
    const genData = state.genData as Record<string, unknown>;
    const dynamicCost = state.dynamicCost as number;

    const projectData: Partial<Project> = {
      id: crypto.randomUUID(),
      files,
      description: (genData?.description as string) || row.prompt,
      prompt: row.prompt,
      orgId: row.org_id ?? undefined,
      createdAt: new Date().toISOString(),
      manifest: {
        mode,
        protocol,
        strategy: strategyMarkdown,
        docs,
        simulation,
        launch,
        visuals: visualTokens,
        security: {
          ...security,
          auditLog: (security.vulnerabilities || []).map(
            (v) => `${v.severity.toUpperCase()}: ${v.type} - ${v.description}`,
          ),
          lastScanAt: new Date().toISOString(),
        },
        sentinel,
        economy,
        broker,
        legal,
        ...(qaResult
          ? {
              qa: {
                status: qaResult.status === "pass" ? "pass" : "fail",
                lastRunAt: new Date().toISOString(),
                errors: (qaResult.testSteps || [])
                  .filter((s) => s.result === "failure")
                  .map((s) => s.error || s.step || "unknown"),
                reportUrl: "/dashboard/qa/" + crypto.randomUUID(),
              },
            }
          : {}),
        monetization: {
          affiliateCut: 0.2,
          revenueShareActive: true,
        },
      },
    };

    const savedProject = await saveProjectDB(projectData as Project);
    // Credits were already atomically reserved in the intent stage via reserve_credits.
    // No additional deduction needed here. dynamicCost is retained in state for observability.
    void dynamicCost;

    await setStage(
      jobId,
      "complete",
      {
        status: "complete",
        result: { project: savedProject as unknown as Record<string, unknown> },
        project_id: savedProject.id,
      },
      "Manifestation complete. Empire initialized in database.",
    );
  } catch (err) {
    await failManifestation(jobId, `Persist stage failed: ${(err as Error).message}`);
    throw err;
  }
}

export type StageName = "intent" | "generate" | "polish" | "persist";

export const nextStage: Record<StageName, StageName | null> = {
  intent: "generate",
  generate: "polish",
  polish: "persist",
  persist: null,
};
