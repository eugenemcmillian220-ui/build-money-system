import "server-only";
import { traced } from "@/lib/telemetry";
import { Project, GenerationResult, type ProjectManifest } from "@/lib/types";
import type { AppSpecOutline } from "@/lib/llm";
import type { OverseerResult } from "@/lib/agents/overseer";
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



/** Stage budget — 240 s safe under the 300 s Vercel Hobby hard cap. */
const STAGE_BUDGET_MS = 240_000;
/** Per-agent call timeout — generous under the 300 s Hobby cap. */
const AGENT_CALL_TIMEOUT_MS = 40_000;
/** Max fix-pass iterations — 300 s Hobby cap allows multiple fix passes. */
const MAX_FIX_ITERATIONS = 3;

// Agents are now lazy-loaded on demand within each stage to improve cold start times.

type StageState = Record<string, unknown>;

function mergeState(row: ManifestationRow, patch: StageState): StageState {
  return { ...(row.state ?? {}), ...patch };
}

/**
 * intent-classify: Runs classifier agent + credit reservation. Fast (~10-30s).
 * Gets its own 60s serverless budget (Vercel Hobby).
 */
export async function runIntentClassifyStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "intent-classify", { status: "running" }, "Classifying intent & reserving credits...");
    const { classifyIntent } = await import("@/lib/agents/classifier");
    const opts = (row.options ?? {}) as { mode?: string; protocol?: string; theme?: string; primaryColor?: string; builderType?: "automated" | "granular" };

    const classification = await traced(
      "agent.classifier",
      { "agent.role": "Classifier" },
      () => classifyIntent(row.prompt),
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

    const builderType = opts.builderType || "automated";
    const nextState = mergeState(row, {
      mode,
      protocol,
      dynamicCost,
      creditsReserved,
      builderType,
    });
    await setStage(jobId, "intent-classify", { state: nextState }, `Classification complete (${builderType} mode) → scouting strategy...`);
  } catch (err) {
    await failManifestation(jobId, `Intent-classify stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * intent-scout: Runs Scout agent to draft strategy.
 * Gets its own 60s serverless budget (Vercel Hobby).
 */
export async function runIntentScoutStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "intent-scout", { status: "running" }, "Scouting strategy & market analysis...");
    const { runScoutAgent } = await import("@/lib/agents/scout");
    const state = row.state as StageState;
    const protocol = state.protocol as string;
    if (!protocol) throw new Error("Intent-classify stage did not produce protocol.");

    let strategy;
    try {
      strategy = await withTimeout(
        traced(
          "agent.scout",
          { "agent.role": "Scout" },
          () => runScoutAgent(row.prompt, protocol),
        ),
        AGENT_CALL_TIMEOUT_MS,
        "runScoutAgent",
      );
    } catch (scoutErr) {
      logger.warn("Scout agent timed out or failed, using fallback strategy", {
        jobId,
        error: (scoutErr as Error).message,
      });
      await appendLog(jobId, "warn", `Scout agent failed (${(scoutErr as Error).message}), using fallback strategy.`);
      strategy = {
        strategyMarkdown: "# Default Strategy\nBuild fast, iterate quickly.",
        recommendedStack: ["Next.js", "Tailwind", "Supabase"],
        competitorInsights: "No direct competitors identified.",
      };
    }
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
 * Gets its own 60s serverless budget (Vercel Hobby).
 */
export async function runIntentArchitectStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "intent-architect", { status: "running" }, "Designing architecture plan...");
    const { runArchitectAgent } = await import("@/lib/agents/architect");
    const state = row.state as StageState;
    const protocol = state.protocol as string;
    const strategyMarkdown = state.strategyMarkdown as string;
    const builderType = (state.builderType as "automated" | "granular") || "automated";
    if (!strategyMarkdown) throw new Error("Intent-scout stage did not produce strategyMarkdown.");

    const opts = (row.options ?? {}) as { theme?: string; primaryColor?: string };

    let architecture;
    try {
      architecture = await withTimeout(
        traced(
          "agent.architect",
          { "agent.role": "Architect", "builder.type": builderType },
          () => runArchitectAgent(row.prompt, strategyMarkdown, builderType),
        ),
        AGENT_CALL_TIMEOUT_MS,
        "runArchitectAgent",
      );
    } catch (archErr) {
      logger.warn("Architect agent timed out or failed, using fallback architecture", {
        jobId,
        error: (archErr as Error).message,
      });
      await appendLog(jobId, "warn", `Architect agent failed (${(archErr as Error).message}), using fallback architecture.`);
      architecture = {
        scaffolding: { "src/app/page.tsx": "Main entry point" },
        coreLogicPlan: "Build a standard Next.js 15 application.",
        fileStructure: ["src/app/page.tsx", "src/lib/supabase.ts"],
        databaseRequirements: ["Standard Supabase Auth tables"],
      };
    }
    await appendLog(jobId, "info", "Architect complete — structure planned.");

    const visualTokens = {
      theme: opts.theme || "dark",
      primaryColor: opts.primaryColor || "#f59e0b",
      fontFamily: "Inter, sans-serif",
    };

    const { PHASE_19_SYSTEM_PROMPT } = await import("@/lib/prompts/phase-19");
    const finalPrompt = `
${PHASE_19_SYSTEM_PROMPT}

BUILD CONTEXT:
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
 * truncation risk. Gets its own 60s serverless budget (Vercel Hobby).
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
      await appendLog(jobId, "warn", `Plan outline failed (${(llmErr as Error).message}), using template fallback.`);
      outline = fallbackOutline(row.prompt);
      usedFallback = true;
    }

    await appendLog(jobId, "info", `Outline complete — ${outline.features.length} features, ${outline.pages.length} pages planned.`);

    const nextState = mergeState(row, {
      outline,
      usedFallback,
    });
    await setStage(jobId, "plan-outline", { state: nextState }, "Outline complete → detailing components...");
  } catch (err) {
    await failManifestation(jobId, `Plan-outline stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * plan-details: runs planSpecDetails to produce the full component spec.
 * Larger JSON = slower, higher truncation risk.
 * Gets its own 60s serverless budget (Vercel Hobby).
 */
export async function runPlanDetailsStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "plan-details", { status: "running" }, "Generating component details...");
    const state = row.state as StageState;
    const finalPrompt = state.finalPrompt as string;
    const outline = state.outline as AppSpecOutline;
    if (!outline) throw new Error("Plan-outline stage did not produce outline.");

    const stageStart = Date.now();
    let spec;
    let usedFallback = state.usedFallback as boolean | undefined;

    try {
      const { planSpecDetails } = await import("@/lib/llm");
      spec = await withTimeout(
        planSpecDetails(finalPrompt, outline),
        AGENT_CALL_TIMEOUT_MS * 1.5, // Detailed planning needs more time
        "planSpecDetails",
      );
    } catch (llmErr) {
      logger.warn("planSpecDetails LLM failed, using template fallback", {
        jobId,
        error: (llmErr as Error).message,
        elapsedMs: Date.now() - stageStart,
      });
      await appendLog(jobId, "warn", `Plan details failed (${(llmErr as Error).message}), using template fallback.`);
      spec = fallbackDetails(outline);
      usedFallback = true;
    }

    await appendLog(jobId, "info", `Details complete — ${spec.components.length} components specified.`);

    const nextState = mergeState(row, {
      spec,
      usedFallback,
    });
    await setStage(jobId, "plan-details", { state: nextState }, "Planning complete → building code...");
  } catch (err) {
    await failManifestation(jobId, `Plan-details stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * @deprecated Use runPlanOutlineStage + runPlanDetailsStage instead.
 * Kept for backward compatibility.
 */
export async function runGeneratePlanStage(jobId: string, baseUrl: string): Promise<void> {
  await runPlanOutlineStage(jobId, baseUrl);
  await runPlanDetailsStage(jobId, baseUrl);
}

/**
 * generate-build-code: runs Developer agent to produce the first codebase draft.
 * Heavy compute — gets its own 300s serverless budget (Vercel Hobby).
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
      const { runDeveloperAgent } = await import("@/lib/agents/developer");
      const result = await withTimeout(
        runDeveloperAgent(state.finalPrompt as string, {
          mode: "web-app",
          multiFile: true,
          orgId: row.org_id ?? undefined,
          precomputedSpec: spec,
        }),
        STAGE_BUDGET_MS - 20_000,
        "runDeveloperAgent",
      );

      const devResult = result as GenerationResult;
      files = devResult.files;
      projectName = (devResult.description || "Untitled").split("\n")[0].slice(0, 100);
      projectDesc = devResult.description || row.prompt;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      genData = devResult as any;
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
      files,
      projectName,
      projectDesc,
      genData,
      usedFallback,
    });
    await setStage(jobId, "generate-build-code", { state: nextState }, "Code built → running fix passes...");
  } catch (err) {
    await failManifestation(jobId, `Generate-build-code stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * generate-build-fix: runs linting/fixing passes on the generated codebase.
 * Gets its own 300s serverless budget (Vercel Hobby).
 */
export async function runGenerateBuildFixStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "generate-build-fix", { status: "running" }, "Running automated fix passes...");
    const state = row.state as StageState;
    let files = state.files as Record<string, string>;
    const genData = state.genData as Record<string, unknown>;
    const { fixFiles, fixBrokenFiles, testFiles } = await import("@/lib/llm");
    const { codeSandbox } = await import("@/lib/sandbox");

    for (let pass = 1; pass <= MAX_FIX_ITERATIONS; pass++) {
      const testResult = await testFiles(files);
      if (testResult.success) break;

      if (testResult.errors) {
        logger.info("Fix pass running", {
          jobId,
          pass,
          errorCount: testResult.errors.length,
        });
        await appendLog(jobId, "info", `Fix pass ${pass}/${MAX_FIX_ITERATIONS}: ${testResult.errors.length} errors found.`);

        const errorText = testResult.errors.join("\n");
        const brokenPaths = testResult.errors
          .map((e: string) => e.split(":")[0].trim())
          .filter((p: string) => p.endsWith(".tsx") || p.endsWith(".ts"));

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
    const projectDesc = (state.projectDesc as string) || row.prompt;
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
        visuals: state.visualTokens as ProjectManifest["visuals"],
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
 * Gets its own 60s serverless budget (Vercel Hobby).
 */
export async function runPolishAnalyzeStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "polish-analyze", { status: "running" }, "Running analysis agents (Chronicler + Security + Economy + Legal)...");
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

    const [docs, security, economy, legal, sentinel, simulation, broker, sculptor, scrutinizer, visionary, diplomatResult, hiveMind, meshCoordinator, pulseMonitor] = await Promise.all([
      safeAgent("Chronicler", jobId, null, async () => {
        const { runChroniclerAgent } = await import("@/lib/agents/chronicler");
        return traced("agent.chronicler", { "agent.role": "Chronicler" }, () => runChroniclerAgent(files));
      }),
      safeAgent("Security", jobId, defaultSecurity, async () => {
        const { runSecurityAudit } = await import("@/lib/agents/security");
        return traced("agent.security", { "agent.role": "Security" }, () => runSecurityAudit(files));
      }),
      safeAgent("Economy", jobId, undefined, async () => {
        const { runEconomyAgent } = await import("@/lib/agents/economy");
        return traced("agent.economy", { "agent.role": "Economy" }, () => runEconomyAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project));
      }),
      safeAgent("Legal", jobId, undefined, async () => {
        const { runLegalAgent } = await import("@/lib/agents/legal");
        return traced("agent.legal", { "agent.role": "Legal" }, () => runLegalAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project));
      }),
      isElite
        ? safeAgent("Sentinel", jobId, undefined, async () => {
            const { runSentinelAgent } = await import("@/lib/agents/sentinel");
            return traced("agent.sentinel", { "agent.role": "Sentinel" }, () => runSentinelAgent(files));
          })
        : Promise.resolve(undefined),
      isElite
        ? safeAgent("Phantom", jobId, undefined, async () => {
            const { runPhantom } = await import("@/lib/agents/phantom");
            return traced("agent.phantom", { "agent.role": "Phantom" }, () => runPhantom({ name: projectName, description: projectDesc, files, id: "temp", createdAt: new Date().toISOString() } as Project));
          })
        : Promise.resolve(undefined),
      (async () => {
        if (isElite && row.org_id) {
          const { data: existingProjects } = await supabaseAdmin
            .from("projects")
            .select("*")
            .eq("org_id", row.org_id)
            .limit(10);
          return safeAgent("Broker", jobId, defaultBroker, async () => {
            const { runBrokerAgent } = await import("@/lib/agents/broker");
            return traced("agent.broker", { "agent.role": "Broker" }, () => runBrokerAgent({
              description: projectDesc,
              id: "temp",
            } as unknown as Project, existingProjects || []));
          });
        }
        return defaultBroker;
      })(),
      safeAgent("Sculptor", jobId, undefined, async () => {
        const { runSculptorAgent } = await import("@/lib/agents/sculptor");
        return traced("agent.sculptor", { "agent.role": "Sculptor" }, () => runSculptorAgent(files));
      }),
      safeAgent("Scrutinizer", jobId, undefined, async () => {
        const { runScrutinizerAgent } = await import("@/lib/agents/scrutinizer");
        return traced("agent.scrutinizer", { "agent.role": "Scrutinizer" }, () => runScrutinizerAgent(files));
      }),
      safeAgent("Visionary", jobId, undefined, async () => {
        const { runVisionaryAgent } = await import("@/lib/agents/visionary");
        return traced("agent.visionary", { "agent.role": "Visionary" }, () => runVisionaryAgent(projectDesc));
      }),
      safeAgent("Diplomat", jobId, undefined, async () => {
        const { runDiplomatAgent } = await import("@/lib/agents/diplomat");
        return traced("agent.diplomat", { "agent.role": "Diplomat" }, () => runDiplomatAgent(projectDesc, ["Next.js", "Supabase", "Vercel"]));
      }),
      safeAgent("HiveMind", jobId, undefined, async () => {
        const { runHiveMindAgent } = await import("@/lib/agents/hive-mind-agent");
        return traced("agent.hivemind", { "agent.role": "HiveMind" }, () => runHiveMindAgent(projectName, projectDesc, [protocol]));
      }),
      safeAgent("MeshCoordinator", jobId, undefined, async () => {
        const { runMeshCoordinatorAgent } = await import("@/lib/agents/mesh-coordinator");
        return traced("agent.mesh", { "agent.role": "MeshCoordinator" }, () => runMeshCoordinatorAgent(projectName, ["code-gen", "security-audit", "deployment"]));
      }),
      safeAgent("PulseMonitor", jobId, undefined, async () => {
        const { runPulseMonitorAgent } = await import("@/lib/agents/pulse-monitor");
        return traced("agent.pulse", { "agent.role": "PulseMonitor" }, () => runPulseMonitorAgent(projectName, projectDesc));
      }),
    ]);

    await appendLog(jobId, "info", "All 25 analysis agents complete — documented, audited, sculpted, & analyzed.");

    const nextState = mergeState(row, {
      docs,
      security,
      economy,
      legal,
      sentinel,
      simulation,
      broker,
      sculptor,
      scrutinizer,
      visionary,
      diplomatResult,
      hiveMind,
      meshCoordinator,
      pulseMonitor,
    });
    await setStage(jobId, "polish-analyze", { state: nextState }, "Analysis complete → launching...");
  } catch (err) {
    await failManifestation(jobId, `Polish-analyze stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * polish-launch: Runs Herald + Overseer (depend on Chronicler docs from
 * polish-analyze). Gets its own 60s serverless budget (Vercel Hobby).
 */
export async function runPolishLaunchStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "polish-launch", { status: "running" }, "Generating launch assets (Herald + Overseer)...");
    const state = row.state as StageState;
    const files = state.files as Record<string, string>;
    const projectName = (state.projectName as string) || "Untitled";
    const projectDesc = state.projectDesc as string;
    const mode = state.mode as string;
    const protocol = state.protocol as string;
    const strategyMarkdown = state.strategyMarkdown as string;
    const docs = state.docs as Record<string, unknown>;
    const genData = state.genData as Record<string, unknown>;
    const isElite = mode === "elite";

    const [launch, qaResult] = await Promise.all([
      safeAgent("Herald", jobId, null, async () => {
        const { runHerald } = await import("@/lib/agents/herald");
        return traced("agent.herald", { "agent.role": "Herald" }, () => runHerald({
          name: projectName,
          description: projectDesc,
          files,
          id: "temp",
          createdAt: new Date().toISOString(),
          manifest: { strategy: strategyMarkdown, docs, mode, protocol },
        } as unknown as Project));
      }),
      isElite
        ? safeAgent("Overseer", jobId, null, async () => {
            const { runOverseerAgent } = await import("@/lib/agents/overseer");
            return traced("agent.overseer", { "agent.role": "Overseer" }, () => runOverseerAgent({
              ...genData,
              files,
              id: "temp",
              createdAt: new Date().toISOString(),
              manifest: { strategy: strategyMarkdown, docs, mode, protocol },
            } as unknown as Project));
          })
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

    // Phase 1: Run Chronicler + all 25 independent agents in parallel.
    // Chronicler is critical for Herald/Overseer, but all others have no deps.
    const [docs, security, economy, legal, sentinel, simulation, broker, sculptor, scrutinizer, visionary, diplomatResult, hiveMind, meshCoordinator, pulseMonitor] = await Promise.all([
      // Chronicler: needed by Herald — runs in parallel with the others
      safeAgent("Chronicler", jobId, null, async () => {
        const { runChroniclerAgent } = await import("@/lib/agents/chronicler");
        return traced("agent.chronicler", { "agent.role": "Chronicler" }, () => runChroniclerAgent(files));
      }),
      safeAgent("Security", jobId, defaultSecurity, async () => {
        const { runSecurityAudit } = await import("@/lib/agents/security");
        return traced("agent.security", { "agent.role": "Security" }, () => runSecurityAudit(files));
      }),
      safeAgent("Economy", jobId, undefined, async () => {
        const { runEconomyAgent } = await import("@/lib/agents/economy");
        return traced("agent.economy", { "agent.role": "Economy" }, () => runEconomyAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project));
      }),
      safeAgent("Legal", jobId, undefined, async () => {
        const { runLegalAgent } = await import("@/lib/agents/legal");
        return traced("agent.legal", { "agent.role": "Legal" }, () => runLegalAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol },
        } as unknown as Project));
      }),
      isElite
        ? safeAgent("Sentinel", jobId, undefined, async () => {
            const { runSentinelAgent } = await import("@/lib/agents/sentinel");
            return traced("agent.sentinel", { "agent.role": "Sentinel" }, () => runSentinelAgent(files));
          })
        : Promise.resolve(undefined),
      isElite
        ? safeAgent("Phantom", jobId, undefined, async () => {
            const { runPhantom } = await import("@/lib/agents/phantom");
            return traced("agent.phantom", { "agent.role": "Phantom" }, () => runPhantom({ name: projectName, description: projectDesc, files, id: "temp", createdAt: new Date().toISOString() } as Project));
          })
        : Promise.resolve(undefined),
      (async () => {
        if (isElite && row.org_id) {
          const { data: existingProjects } = await supabaseAdmin
            .from("projects")
            .select("*")
            .eq("org_id", row.org_id)
            .limit(10);
          return safeAgent("Broker", jobId, defaultBroker, async () => {
            const { runBrokerAgent } = await import("@/lib/agents/broker");
            return traced("agent.broker", { "agent.role": "Broker" }, () => runBrokerAgent({
              description: projectDesc,
              id: "temp",
            } as unknown as Project, existingProjects || []));
          });
        }
        return defaultBroker;
      })(),
      safeAgent("Sculptor", jobId, undefined, async () => {
        const { runSculptorAgent } = await import("@/lib/agents/sculptor");
        return traced("agent.sculptor", { "agent.role": "Sculptor" }, () => runSculptorAgent(files));
      }),
      safeAgent("Scrutinizer", jobId, undefined, async () => {
        const { runScrutinizerAgent } = await import("@/lib/agents/scrutinizer");
        return traced("agent.scrutinizer", { "agent.role": "Scrutinizer" }, () => runScrutinizerAgent(files));
      }),
      safeAgent("Visionary", jobId, undefined, async () => {
        const { runVisionaryAgent } = await import("@/lib/agents/visionary");
        return traced("agent.visionary", { "agent.role": "Visionary" }, () => runVisionaryAgent(projectDesc));
      }),
      safeAgent("Diplomat", jobId, undefined, async () => {
        const { runDiplomatAgent } = await import("@/lib/agents/diplomat");
        return traced("agent.diplomat", { "agent.role": "Diplomat" }, () => runDiplomatAgent(projectDesc, ["Next.js", "Supabase", "Vercel"]));
      }),
      safeAgent("HiveMind", jobId, undefined, async () => {
        const { runHiveMindAgent } = await import("@/lib/agents/hive-mind-agent");
        return traced("agent.hivemind", { "agent.role": "HiveMind" }, () => runHiveMindAgent(projectName, projectDesc, [protocol]));
      }),
      safeAgent("MeshCoordinator", jobId, undefined, async () => {
        const { runMeshCoordinatorAgent } = await import("@/lib/agents/mesh-coordinator");
        return traced("agent.mesh", { "agent.role": "MeshCoordinator" }, () => runMeshCoordinatorAgent(projectName, ["code-gen", "security-audit", "deployment"]));
      }),
      safeAgent("PulseMonitor", jobId, undefined, async () => {
        const { runPulseMonitorAgent } = await import("@/lib/agents/pulse-monitor");
        return traced("agent.pulse", { "agent.role": "PulseMonitor" }, () => runPulseMonitorAgent(projectName, projectDesc));
      }),
    ]);

    // Phase 2: Run Herald + Overseer (depend on Docs from Chronicler).
    const [launch, qaResult] = await Promise.all([
      safeAgent("Herald", jobId, null, async () => {
        const { runHerald } = await import("@/lib/agents/herald");
        return traced("agent.herald", { "agent.role": "Herald" }, () => runHerald({
          name: projectName,
          description: projectDesc,
          files,
          id: "temp",
          createdAt: new Date().toISOString(),
          manifest: { strategy: strategyMarkdown, docs: docs as Record<string, unknown>, mode, protocol },
        } as unknown as Project));
      }),
      isElite
        ? safeAgent("Overseer", jobId, null, async () => {
            const { runOverseerAgent } = await import("@/lib/agents/overseer");
            return traced("agent.overseer", { "agent.role": "Overseer" }, () => runOverseerAgent({
              ...genData,
              files,
              id: "temp",
              createdAt: new Date().toISOString(),
              manifest: { strategy: strategyMarkdown, docs: docs as Record<string, unknown>, mode, protocol },
            } as unknown as Project));
          })
        : Promise.resolve(null),
    ]);

    await appendLog(jobId, "info", "All 25 polish agents complete.");

    const nextState = mergeState(row, {
      docs,
      security,
      economy,
      legal,
      sentinel,
      simulation,
      broker,
      sculptor,
      scrutinizer,
      visionary,
      diplomatResult,
      hiveMind,
      meshCoordinator,
      pulseMonitor,
      launch,
      qaResult,
    });
    await setStage(jobId, "polish-parallel", { state: nextState }, "Polish complete → persisting...");
  } catch (err) {
    await failManifestation(jobId, `Polish-parallel stage failed: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * persist: Saves the final manifestation results to the database as a Project.
 * Atomic deduction of credits happens here.
 * Gets its own 60s serverless budget (Vercel Hobby).
 */
export async function runPersistStage(jobId: string, _baseUrl: string): Promise<void> {
  const row = await loadManifestation(jobId);
  if (!row) return;

  try {
    await setStage(jobId, "persist", { status: "running" }, "Persisting empire to Sovereign database...");
    const state = row.state as StageState;
    const files = state.files as Record<string, string>;
    const projectName = state.projectName as string;
    const projectDesc = state.projectDesc as string;
    const protocol = state.protocol as string;
    const mode = state.mode as string;
    const dynamicCost = state.dynamicCost as number;
    const docs = state.docs as Record<string, unknown>;
    const security = state.security as Record<string, unknown>;
    const economy = state.economy as Record<string, unknown>;
    const legal = state.legal as Record<string, unknown>;
    // sentinel and simulation variables removed as they are unused in the persist stage.
    const broker = state.broker as Record<string, unknown>;
    const sculptor = state.sculptor as Record<string, unknown>;
    const scrutinizer = state.scrutinizer as Record<string, unknown>;
    const visionary = state.visionary as Record<string, unknown>;
    const diplomatResult = state.diplomatResult as Record<string, unknown>;
    const hiveMind = state.hiveMind as Record<string, unknown>;
    const meshCoordinator = state.meshCoordinator as Record<string, unknown>;
    const pulseMonitor = state.pulseMonitor as Record<string, unknown>;
    const launch = state.launch as Record<string, unknown>;
    const qaResult = state.qaResult as OverseerResult | undefined;

    const usedFallback = state.usedFallback as boolean | undefined;
    const existingProjectId = (state.projectId as string) || row.project_id;

    const projectData: Partial<Project> = {
      ...(existingProjectId ? { id: existingProjectId } : {}),
      name: projectName,
      description: projectDesc,
      files,
      orgId: row.org_id ?? undefined,
      prompt: row.prompt,
      metadata: usedFallback ? { specSource: "template_fallback" } : undefined,
      manifest: {
        mode,
        protocol,
        strategy: state.strategyMarkdown as string,
        visuals: state.visualTokens as ProjectManifest["visuals"],
        builderType: (state.builderType as string) || "automated",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        docs: docs as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        launch: launch as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        security: security as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        economy: economy as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        broker: broker as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        legal: legal as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sculptor: sculptor as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scrutinizer: scrutinizer as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visionary: visionary as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        diplomat: diplomatResult as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hiveMind: hiveMind as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        meshCoordinator: meshCoordinator as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pulseMonitor: pulseMonitor as any,
        ...(qaResult
          ? {
              qa: {
                status: qaResult.status === "pass" ? "pass" : "fail",
                lastRunAt: new Date().toISOString(),
                errors: (qaResult.testSteps || [])
                  .filter((s: OverseerResult["testSteps"][number]) => s.result === "failure")
                  .map((s: OverseerResult["testSteps"][number]) => s.error || s.step || "unknown"),
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
