import "server-only";
import { traced } from "@/lib/telemetry";
import { Project } from "@/lib/types";
import { saveProjectDB } from "@/lib/supabase/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { monetizationEngine } from "@/lib/monetization";
import { ADMIN_FREE_TIER } from "@/lib/admin-emails";
import { logger } from "@/lib/logger";
import { withTimeout, StageTimeoutError } from "@/lib/pipeline-timeout";
import { fallbackOutline, fallbackDetails, fallbackFileMap } from "@/lib/template-fallback";
import {
  appendLog,
  failManifestation,
  loadManifestation,
  setStage,
  type ManifestationRow,
} from "./store";

const _AGENT_THROTTLE_MS = 100;

/** Stage budget — leaves 10s headroom in Vercel Hobby's hard 60s function cap. */
const STAGE_BUDGET_MS = 50_000;
/** Per-agent call timeout — matches ai.ts 25s per-call budget. */
const AGENT_CALL_TIMEOUT_MS = 25_000;
/** Max fix-pass iterations — Vercel Hobby 60s cap allows at most 1 LLM fix pass. */
const MAX_FIX_ITERATIONS = 1;

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

/**
 * intent-classify: Runs classifier agent + credit reservation. Fast (~10-30s).
 * Gets its own 300s serverless budget.
 */
export async function runIntentClassifyStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "intent-classify", { status: "running" }, "Classifying intent & reserving credits...");
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
      const { data: orgData } = await supabaseAdmin
        .from("organizations")
        .select("billing_tier")
        .eq("id", row.org_id)
        .single();
      const isAdmin = orgData?.billing_tier === ADMIN_FREE_TIER;

      if (!isAdmin) {
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
      }
      creditsReserved = !isAdmin;
      await supabaseAdmin
        .from("manifestations")
        .update({
          state: { ...(row.state ?? {}), creditsReserved, dynamicCost },
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      if (creditsReserved) {
        await appendLog(jobId, "info", `Reserved ${dynamicCost} credits for manifestation.`);
      } else {
        await appendLog(jobId, "info", "Admin account — credit reservation skipped.");
      }
    }

    const nextState = mergeState(row, {
      mode,
      protocol,
      dynamicCost,
      creditsReserved,
    });
    await setStage(jobId, "intent-classify", { state: nextState }, "Classification complete → scouting strategy...");
  } catch (err) {
    await failManifestation(jobId, `Intent-classify stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * intent-scout: Runs Scout agent to draft strategy. Moderate (~30-60s).
 * Gets its own 300s serverless budget.
 */
export async function runIntentScoutStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "intent-scout", { status: "running" }, "Scouting strategy & market analysis...");
    const agents = await loadAgents();
    const state = row.state as StageState;
    const protocol = state.protocol as string;
    if (!protocol) throw new Error("Intent-classify stage did not produce protocol.");

    const strategy = await traced(
      "agent.scout",
      { "agent.role": "Scout" },
      () => agents.runScoutAgent(row.prompt, protocol),
    );
    await appendLog(jobId, "info", "Scout complete — strategy drafted.");

    const nextState = mergeState(row, {
      strategyMarkdown: strategy.strategyMarkdown,
    });
    await setStage(jobId, "intent-scout", { state: nextState }, "Strategy drafted → architecting...");
  } catch (err) {
    await failManifestation(jobId, `Intent-scout stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * intent-architect: Runs Architect agent to produce architecture plan + finalPrompt.
 * Heaviest sub-stage (~3-5 min). Gets its own 300s serverless budget.
 */
export async function runIntentArchitectStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "intent-architect", { status: "running" }, "Designing architecture plan...");
    const agents = await loadAgents();
    const state = row.state as StageState;
    const mode = state.mode as string;
    const protocol = state.protocol as string;
    const strategyMarkdown = state.strategyMarkdown as string;
    if (!strategyMarkdown) throw new Error("Intent-scout stage did not produce strategyMarkdown.");

    const opts = (row.options ?? {}) as { theme?: string; primaryColor?: string };

    const architecture = await traced(
      "agent.architect",
      { "agent.role": "Architect" },
      () => agents.runArchitectAgent(row.prompt, strategyMarkdown),
    );
    await appendLog(jobId, "info", "Architect complete — structure planned.");

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
${strategyMarkdown}

ARCHITECTURE PLAN:
${architecture.coreLogicPlan}
FILE STRUCTURE: ${architecture.fileStructure.join(", ")}
DATABASE REQS: ${architecture.databaseRequirements.join(", ")}

USER REQUEST: "${row.prompt}"
`;

    const nextState = mergeState(row, {
      architecture,
      visualTokens,
      finalPrompt,
    });
    await setStage(jobId, "intent-architect", { state: nextState }, "Architecture complete → planning outline...");
  } catch (err) {
    await failManifestation(jobId, `Intent-architect stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * @deprecated Use runIntentClassifyStage + runIntentScoutStage + runIntentArchitectStage instead.
 * Kept for backward compatibility with direct callers.
 */
export async function runIntentStage(jobId: string, baseUrl: string): Promise<void> {
  await runIntentClassifyStage(jobId, baseUrl);
  await runIntentScoutStage(jobId, baseUrl);
  await runIntentArchitectStage(jobId, baseUrl);
}

/**
 * plan-outline: runs planSpecOutline to produce the high-level architecture
 * (name, features, pages, integrations, visuals). Smaller JSON = faster, less
 * truncation risk. Gets its own 300s serverless budget.
 */
export async function runPlanOutlineStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "plan-outline", { status: "running" }, "Drafting architecture outline...");
    const state = row.state as StageState;
    const finalPrompt = state.finalPrompt as string;
    if (!finalPrompt) throw new Error("Intent stage did not produce finalPrompt.");

    const stageStart = Date.now();
    let outline;
    let usedFallback = false;

    try {
      const { planSpecOutline } = await import("@/lib/llm");
      outline = await withTimeout(
        planSpecOutline(finalPrompt, []),
        AGENT_CALL_TIMEOUT_MS,
        "planSpecOutline",
      );
    } catch (llmErr) {
      logger.warn("planSpecOutline LLM failed, using template fallback", {
        jobId,
        error: (llmErr as Error).message,
        elapsedMs: Date.now() - stageStart,
      });
      await appendLog(jobId, "warn", `Outline LLM failed (${(llmErr as Error).message}), using template fallback.`);
      outline = fallbackOutline(finalPrompt);
      usedFallback = true;
    }

    await appendLog(
      jobId,
      "info",
      `Outline complete — ${outline.features.length} features, ${outline.pages.length} pages${usedFallback ? " (fallback)" : ""}.`,
    );

    const nextState = mergeState(row, {
      outline,
      spec: { name: outline.name, features: outline.features, featureCount: outline.features.length },
      usedFallback,
    });
    await setStage(jobId, "plan-outline", { state: nextState }, "Outline complete → detailing components...");
  } catch (err) {
    await failManifestation(jobId, `Plan-outline stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * plan-details: given the outline, runs planSpecDetails to produce
 * components, schema, and fileStructure. Merges with outline into a full
 * AppSpec. Gets its own 300s serverless budget.
 */
export async function runPlanDetailsStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "plan-details", { status: "running" }, "Detailing components & schema...");
    const state = row.state as StageState;
    const finalPrompt = state.finalPrompt as string;
    const outline = state.outline as import("@/lib/llm").AppSpecOutline | undefined;
    if (!finalPrompt) throw new Error("Intent stage did not produce finalPrompt.");
    if (!outline) throw new Error("Plan-outline stage did not produce outline.");

    const stageStart = Date.now();
    let details;
    let usedFallback = state.usedFallback as boolean | undefined;

    try {
      const { planSpecDetails } = await import("@/lib/llm");
      details = await withTimeout(
        planSpecDetails(finalPrompt, outline),
        AGENT_CALL_TIMEOUT_MS,
        "planSpecDetails",
      );
    } catch (llmErr) {
      logger.warn("planSpecDetails LLM failed, using template fallback", {
        jobId,
        error: (llmErr as Error).message,
        elapsedMs: Date.now() - stageStart,
      });
      await appendLog(jobId, "warn", `Details LLM failed (${(llmErr as Error).message}), using template fallback.`);
      details = fallbackDetails(outline);
      usedFallback = true;
    }

    await appendLog(
      jobId,
      "info",
      `Details complete — ${details.components.length} components, ${details.fileStructure.length} files planned${usedFallback ? " (fallback)" : ""}.`,
    );

    const spec = { ...outline, ...details };
    const nextState = mergeState(row, { spec, usedFallback });
    await setStage(jobId, "plan-details", { state: nextState }, "Plan complete → queued generate-build.");
  } catch (err) {
    await failManifestation(jobId, `Plan-details stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * @deprecated Use runPlanOutlineStage + runPlanDetailsStage instead.
 * Kept for backward compatibility with direct callers.
 */
export async function runGeneratePlanStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "generate-plan", { status: "running" }, "Planning app specification (planSpec)...");
    const state = row.state as StageState;
    const finalPrompt = state.finalPrompt as string;
    if (!finalPrompt) throw new Error("Intent stage did not produce finalPrompt.");

    const { planSpec } = await import("@/lib/llm");
    const spec = await planSpec(finalPrompt, []);
    await appendLog(jobId, "info", `Plan complete — ${spec.features.length} features, ${spec.pages.length} pages.`);

    const nextState = mergeState(row, { spec });
    await setStage(jobId, "generate-plan", { state: nextState }, "Plan stage complete → queued generate-build.");
  } catch (err) {
    await failManifestation(jobId, `Generate-plan stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * generate-build: builds code from the precomputed spec, runs fix passes,
 * and persists the project. Gets its own serverless timeout budget.
 */
/**
 * generate-build-code: Runs Developer agent (planSpec is already done, so this
 * builds code from the precomputed spec). Gets its own 300s serverless budget.
 */
export async function runGenerateBuildCodeStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "generate-build-code", { status: "running" }, "Building code from spec (Developer agent)...");
    const state = row.state as StageState;
    const spec = state.spec as import("@/lib/types").AppSpec | undefined;
    if (!spec) throw new Error("Plan stage did not produce spec.");

    const stageStart = Date.now();
    let files: Record<string, string>;
    let projectName: string;
    let projectDesc: string;
    let genData: Record<string, unknown>;
    let usedFallback = state.usedFallback as boolean | undefined;

    try {
      const agents = await loadAgents();
      const result = await withTimeout(
        agents.runDeveloperAgent(state.finalPrompt as string, {
          mode: (state.mode as "web-app" | "mobile-app") || "web-app",
          multiFile: true,
          orgId: row.org_id ?? undefined,
          precomputedSpec: spec,
        }),
        STAGE_BUDGET_MS - 20_000,
        "runDeveloperAgent",
      );

      files = result.files;
      projectName = (result.description || "Untitled").split("\n")[0].slice(0, 100);
      projectDesc = result.description || row.prompt;
      genData = result as unknown as Record<string, unknown>;
    } catch (devErr) {
      logger.warn("Developer agent failed, using template fallback files", {
        jobId,
        error: (devErr as Error).message,
        elapsedMs: Date.now() - stageStart,
      });
      await appendLog(jobId, "warn", `Developer agent failed (${(devErr as Error).message}), using template fallback files.`);
      files = fallbackFileMap(spec);
      projectName = spec.name || "Untitled";
      projectDesc = spec.description || row.prompt;
      genData = { description: projectDesc, files } as Record<string, unknown>;
      usedFallback = true;
    }

    await appendLog(
      jobId,
      "info",
      `Developer complete — ${Object.keys(files).length} files generated${usedFallback ? " (fallback)" : ""}.`,
    );

    const nextState = mergeState(row, {
      genData,
      files,
      projectName,
      projectDesc,
      usedFallback,
    });
    await setStage(jobId, "generate-build-code", { state: nextState }, "Code generated → running fix passes...");
  } catch (err) {
    await failManifestation(jobId, `Generate-build-code stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * generate-build-fix: Runs fix passes + sandbox verification, then persists
 * the initial project. Gets its own 300s serverless budget.
 */
export async function runGenerateBuildFixStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "generate-build-fix", { status: "running" }, "Running fix passes & sandbox verification...");
    const state = row.state as StageState;
    let files = state.files as Record<string, string>;
    const genData = state.genData as Record<string, unknown>;
    if (!files) throw new Error("generate-build-code stage did not produce files.");

    const { testFiles, fixFiles, fixBrokenFiles } = await import("@/lib/llm");
    const { codeSandbox } = await import("@/lib/sandbox");

    const stageStart = Date.now();
    for (let pass = 1; pass <= MAX_FIX_ITERATIONS; pass++) {
      const elapsed = Date.now() - stageStart;
      if (elapsed > STAGE_BUDGET_MS - 30_000) {
        logger.warn("Fix-pass budget exhausted, skipping remaining passes", {
          jobId, pass, elapsedMs: elapsed,
        });
        await appendLog(jobId, "warn", `Fix-pass budget exhausted after ${pass - 1} passes (${elapsed}ms).`);
        break;
      }

      const testResult = await testFiles(files);
      if (testResult.success) {
        logger.info("All tests passed", { jobId, pass });
        await appendLog(jobId, "info", `All tests passed on pass ${pass}.`);
        break;
      }

      if (testResult.errors) {
        logger.info("Fix pass running", {
          jobId,
          pass,
          errorCount: testResult.errors.length,
        });
        await appendLog(jobId, "info", `Fix pass ${pass}/${MAX_FIX_ITERATIONS}: ${testResult.errors.length} errors found.`);

        const errorText = testResult.errors.join("\n");
        const brokenPaths = testResult.errors
          .map(e => e.split(":")[0].trim())
          .filter(p => p.endsWith(".tsx") || p.endsWith(".ts"));

        try {
          if (brokenPaths.length > 0) {
            files = await withTimeout(
              fixBrokenFiles(files, brokenPaths, testResult.errors),
              AGENT_CALL_TIMEOUT_MS,
              `fixBrokenFiles(pass=${pass})`,
            );
          } else {
            files = await withTimeout(
              fixFiles(files, errorText),
              AGENT_CALL_TIMEOUT_MS,
              `fixFiles(pass=${pass})`,
            );
          }
        } catch (fixErr) {
          logger.warn("Fix pass failed, continuing with current files", {
            jobId, pass, error: (fixErr as Error).message,
          });
          await appendLog(jobId, "warn", `Fix pass ${pass} failed: ${(fixErr as Error).message}. Continuing with current files.`);
          break;
        }
      }
    }

    const sandboxResult = await codeSandbox.verifyProject(files);
    if (!sandboxResult.success) {
      const errors = [...sandboxResult.typeErrors, ...sandboxResult.runtimeErrors];
      const brokenPaths = errors.map(e => e.split(":")[0].trim()).filter(p => !!p);
      try {
        files = await withTimeout(
          fixBrokenFiles(files, brokenPaths.length > 0 ? brokenPaths : Object.keys(files), errors),
          AGENT_CALL_TIMEOUT_MS,
          "fixBrokenFiles(sandbox)",
        );
      } catch (sbErr) {
        logger.warn("Sandbox fix failed, continuing with current files", {
          jobId, error: (sbErr as Error).message,
        });
        await appendLog(jobId, "warn", `Sandbox fix failed: ${(sbErr as Error).message}. Continuing with current files.`);
      }
    }

    const projectName = state.projectName as string;
    const projectDesc = state.projectDesc as string || row.prompt;
    const projectId = crypto.randomUUID();

    const initialProject = await saveProjectDB({
      id: projectId,
      files,
      description: projectDesc,
      prompt: row.prompt,
      orgId: row.org_id ?? undefined,
      createdAt: new Date().toISOString(),
      manifest: {
        mode: (state.mode as string) || "universal",
        protocol: (state.protocol as string) || "unknown",
        strategy: state.strategyMarkdown as string,
        visuals: state.visualTokens as Project["manifest"] extends infer M ? (M extends { visuals?: infer V } ? V : never) : never,
      },
    } as Project);

    await appendLog(jobId, "info", `Fix passes complete. Project persisted with ${Object.keys(files).length} files.`);

    const nextState = mergeState(row, {
      genData,
      files,
      projectName,
      projectDesc,
      projectId: initialProject.id,
    });
    await setStage(jobId, "generate-build-fix", { state: nextState, project_id: initialProject.id }, "Build complete → polishing...");
  } catch (err) {
    await failManifestation(jobId, `Generate-build-fix stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * @deprecated Use runGenerateBuildCodeStage + runGenerateBuildFixStage instead.
 * Kept for backward compatibility.
 */
export async function runGenerateBuildStage(jobId: string, baseUrl: string): Promise<void> {
  await runGenerateBuildCodeStage(jobId, baseUrl);
  await runGenerateBuildFixStage(jobId, baseUrl);
}

/**
 * @deprecated Use runGeneratePlanStage + runGenerateBuildStage instead.
 * Kept for backward compatibility with any direct callers.
 */
export async function runGenerateStage(jobId: string, baseUrl: string): Promise<void> {
  await runGeneratePlanStage(jobId, baseUrl);
  await runGenerateBuildStage(jobId, baseUrl);
}

/**
 * Wraps an agent call so a single agent failure doesn't break the entire stage.
 * Returns the fallback value on error and logs a warning.
 */
async function safeAgent<T>(name: string, jobId: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await withTimeout(fn(), AGENT_CALL_TIMEOUT_MS, `${name} agent`);
    logger.debug("Agent completed", { agent: name, jobId, durationMs: Date.now() - start });
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    const isTimeout = err instanceof StageTimeoutError || (err instanceof Error && err.message.includes("timed out"));
    logger.warn("Agent failed (non-fatal)", {
      agent: name,
      jobId,
      error: (err as Error).message,
      durationMs: elapsed,
      isTimeout,
    });
    await appendLog(jobId, "warn", `${name} agent failed (non-fatal, ${elapsed}ms): ${(err as Error).message}`);
    return fallback;
  }
}

/**
 * polish-analyze: Runs the first batch of independent agents in parallel
 * (Chronicler, Security, Economy, Legal, Sentinel, Phantom, Broker).
 * Each agent is wrapped in safeAgent so individual failures are non-fatal.
 * Gets its own 300s serverless budget.
 */
export async function runPolishAnalyzeStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "polish-analyze", { status: "running" }, "Running analysis agents (Chronicler + Security + Economy + Legal)...");
    const agents = await loadAgents();
    const state = row.state as StageState;
    const files = state.files as Record<string, string>;
    const projectName = state.projectName as string;
    const projectDesc = state.projectDesc as string;
    const protocol = state.protocol as string;
    const mode = state.mode as string;
    const isElite = mode === "elite";

    const defaultSecurity = {
      score: 0,
      recommendations: ["Security audit skipped due to agent error."],
      vulnerabilities: [] as { severity: "low" | "medium" | "high" | "critical"; type: string; description: string; file?: string; fix?: string }[],
    };
    const defaultBroker = {
      mergerPotential: [] as { targetProjectId: string; compatibility: number; strategy: string }[],
      negotiationStrategy: isElite ? "Audit pending (no organization linked)." : "Audit skipped (non-elite mode).",
    };

    const [docs, security, economy, legal, sentinel, simulation, broker] = await Promise.all([
      safeAgent("Chronicler", jobId, null, () =>
        traced("agent.chronicler", { "agent.role": "Chronicler" }, () => agents.runChroniclerAgent(files)),
      ),
      safeAgent("Security", jobId, defaultSecurity, () =>
        traced("agent.security", { "agent.role": "Security" }, () => agents.runSecurityAudit(files)),
      ),
      safeAgent("Economy", jobId, undefined, () =>
        traced("agent.economy", { "agent.role": "Economy" }, () => agents.runEconomyAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project)),
      ),
      safeAgent("Legal", jobId, undefined, () =>
        traced("agent.legal", { "agent.role": "Legal" }, () => agents.runLegalAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project)),
      ),
      isElite
        ? safeAgent("Sentinel", jobId, undefined, () =>
            traced("agent.sentinel", { "agent.role": "Sentinel" }, () => agents.runSentinelAgent(files)),
          )
        : Promise.resolve(undefined),
      isElite
        ? safeAgent("Phantom", jobId, undefined, () =>
            traced("agent.phantom", { "agent.role": "Phantom" }, () => agents.runPhantom({ files, id: "temp", createdAt: new Date().toISOString() } as Project)),
          )
        : Promise.resolve(undefined),
      (async () => {
        if (isElite && row.org_id) {
          const { data: existingProjects } = await supabaseAdmin
            .from("projects")
            .select("*")
            .eq("org_id", row.org_id)
            .limit(10);
          return safeAgent("Broker", jobId, defaultBroker, () =>
            traced("agent.broker", { "agent.role": "Broker" }, () => agents.runBrokerAgent({
              description: projectDesc,
              id: "temp",
            } as unknown as Project, existingProjects || [])),
          );
        }
        return defaultBroker;
      })()
    ]);

    await appendLog(jobId, "info", "Analysis agents complete — documented, audited, & analyzed.");

    const nextState = mergeState(row, {
      docs,
      security,
      economy,
      legal,
      sentinel,
      simulation,
      broker,
    });
    await setStage(jobId, "polish-analyze", { state: nextState }, "Analysis complete → launching...");
  } catch (err) {
    await failManifestation(jobId, `Polish-analyze stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * polish-launch: Runs Herald + Overseer (depend on Chronicler docs from
 * polish-analyze). Gets its own 300s serverless budget.
 */
export async function runPolishLaunchStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "polish-launch", { status: "running" }, "Generating launch assets (Herald + Overseer)...");
    const agents = await loadAgents();
    const state = row.state as StageState;
    const files = state.files as Record<string, string>;
    const projectDesc = state.projectDesc as string;
    const mode = state.mode as string;
    const protocol = state.protocol as string;
    const strategyMarkdown = state.strategyMarkdown as string;
    const docs = state.docs as Record<string, unknown>;
    const genData = state.genData as Record<string, unknown>;
    const isElite = mode === "elite";

    const [launch, qaResult] = await Promise.all([
      safeAgent("Herald", jobId, null, () =>
        traced("agent.herald", { "agent.role": "Herald" }, () => agents.runHerald({
          description: projectDesc,
          files,
          id: "temp",
          createdAt: new Date().toISOString(),
          manifest: { strategy: strategyMarkdown, docs, mode, protocol },
        } as unknown as Project)),
      ),
      isElite
        ? safeAgent("Overseer", jobId, null, () =>
            traced("agent.overseer", { "agent.role": "Overseer" }, () => agents.runOverseerAgent({
              ...genData,
              files,
              id: "temp",
              createdAt: new Date().toISOString(),
              manifest: { strategy: strategyMarkdown, docs, mode, protocol },
            } as unknown as Project)),
          )
        : Promise.resolve(null)
    ]);

    await appendLog(jobId, "info", "Launch assets generated.");

    const nextState = mergeState(row, {
      launch,
      qaResult,
    });
    await setStage(jobId, "polish-launch", { state: nextState }, "Polish complete → persisting...");
  } catch (err) {
    await failManifestation(jobId, `Polish-launch stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * @deprecated Use runPolishAnalyzeStage + runPolishLaunchStage instead.
 * Kept for backward compatibility.
 */
export async function runPolishStage(jobId: string, baseUrl: string): Promise<void> {
  await runPolishAnalyzeStage(jobId, baseUrl);
  await runPolishLaunchStage(jobId, baseUrl);
}


/**
 * polish-parallel: Runs ALL polish agents in one serverless invocation using
 * optimal fan-out. Independent agents (Security, Economy, Legal, Sentinel,
 * Phantom, Broker) plus Chronicler run concurrently first. Herald + Overseer
 * run immediately after Chronicler resolves (they need its docs).
 *
 * Replaces the 2-hop polish-analyze → polish-launch chain with a single 300s
 * budget, cutting end-to-end latency significantly.
 *
 * All agents are wrapped in safeAgent — individual failures are non-fatal.
 */
export async function runPolishParallelStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "polish-parallel", { status: "running" }, "Running all polish agents in parallel...");
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

    const defaultSecurity = {
      score: 0,
      recommendations: ["Security audit skipped due to agent error."],
      vulnerabilities: [] as { severity: "low" | "medium" | "high" | "critical"; type: string; description: string; file?: string; fix?: string }[],
    };
    const defaultBroker = {
      mergerPotential: [] as { targetProjectId: string; compatibility: number; strategy: string }[],
      negotiationStrategy: isElite ? "Audit pending (no organization linked)." : "Audit skipped (non-elite mode).",
    };

    // Phase 1: Run Chronicler + all independent agents in parallel.
    // Chronicler is critical for Herald/Overseer, but all others have no deps.
    const [docs, security, economy, legal, sentinel, simulation, broker] = await Promise.all([
      // Chronicler: needed by Herald — runs in parallel with the others
      safeAgent("Chronicler", jobId, null, () =>
        traced("agent.chronicler", { "agent.role": "Chronicler" }, () => agents.runChroniclerAgent(files)),
      ),
      safeAgent("Security", jobId, defaultSecurity, () =>
        traced("agent.security", { "agent.role": "Security" }, () => agents.runSecurityAudit(files)),
      ),
      safeAgent("Economy", jobId, undefined, () =>
        traced("agent.economy", { "agent.role": "Economy" }, () => agents.runEconomyAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project)),
      ),
      safeAgent("Legal", jobId, undefined, () =>
        traced("agent.legal", { "agent.role": "Legal" }, () => agents.runLegalAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project)),
      ),
      isElite
        ? safeAgent("Sentinel", jobId, undefined, () =>
            traced("agent.sentinel", { "agent.role": "Sentinel" }, () => agents.runSentinelAgent(files)),
          )
        : Promise.resolve(undefined),
      isElite
        ? safeAgent("Phantom", jobId, undefined, () =>
            traced("agent.phantom", { "agent.role": "Phantom" }, () => agents.runPhantom({ files, id: "temp", createdAt: new Date().toISOString() } as Project)),
          )
        : Promise.resolve(undefined),
      (async () => {
        if (isElite && row.org_id) {
          const { data: existingProjects } = await supabaseAdmin
            .from("projects")
            .select("*")
            .eq("org_id", row.org_id)
            .limit(10);
          return safeAgent("Broker", jobId, defaultBroker, () =>
            traced("agent.broker", { "agent.role": "Broker" }, () => agents.runBrokerAgent({
              description: projectDesc,
              id: "temp",
            } as unknown as Project, existingProjects || [])),
          );
        }
        return defaultBroker;
      })(),
    ]);

    await appendLog(jobId, "info", "Phase 1 complete (Chronicler + Security + Economy + Legal + extras).");

    // Phase 2: Herald + Overseer — depend on Chronicler docs from Phase 1.
    const [launch, qaResult] = await Promise.all([
      safeAgent("Herald", jobId, null, () =>
        traced("agent.herald", { "agent.role": "Herald" }, () => agents.runHerald({
          description: projectDesc,
          files,
          id: "temp",
          createdAt: new Date().toISOString(),
          manifest: { strategy: strategyMarkdown, docs, mode, protocol },
        } as unknown as Project)),
      ),
      isElite
        ? safeAgent("Overseer", jobId, null, () =>
            traced("agent.overseer", { "agent.role": "Overseer" }, () => agents.runOverseerAgent({
              ...genData,
              files,
              id: "temp",
              createdAt: new Date().toISOString(),
              manifest: { strategy: strategyMarkdown, docs, mode, protocol },
            } as unknown as Project)),
          )
        : Promise.resolve(null),
    ]);

    await appendLog(jobId, "info", "All polish agents complete → persisting empire...");

    const nextState = mergeState(row, {
      docs,
      security,
      economy,
      legal,
      sentinel,
      simulation,
      broker,
      launch,
      qaResult,
    });
    await setStage(jobId, "polish-parallel", { state: nextState }, "Polish complete → persisting...");
  } catch (err) {
    await failManifestation(jobId, `Polish-parallel stage failed: ${(err as Error).message}`);
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
    const projectId = state.projectId as string;

    const projectData: Partial<Project> = {
      id: projectId || crypto.randomUUID(),
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

export type StageName =
  | "intent-classify"
  | "intent-scout"
  | "intent-architect"
  | "intent"
  | "generate"
  | "generate-plan"
  | "plan-outline"
  | "plan-details"
  | "generate-build-code"
  | "generate-build-fix"
  | "generate-build"
  | "polish-analyze"
  | "polish-launch"
  | "polish"
  | "persist"
  | "polish-parallel";

export const nextStage: Record<StageName, StageName | null> = {
  "intent-classify": "intent-scout",
  "intent-scout": "intent-architect",
  "intent-architect": "plan-outline",
  intent: "plan-outline",
  "plan-outline": "plan-details",
  "plan-details": "generate-build-code",
  "generate-plan": "generate-build-code",
  "generate-build-code": "generate-build-fix",
  "generate-build-fix": "polish-parallel",
  "generate-build": "polish-parallel",
  generate: "polish-parallel",
  "polish-analyze": "polish-launch",
  "polish-launch": "persist",
  polish: "persist",
  "polish-parallel": "persist",
  persist: null,
};
