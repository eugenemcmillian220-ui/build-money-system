// DA-058 FIX: TODO: Replace dynamic imports with static imports for bundling optimization
import { NextRequest, NextResponse } from "next/server";
import { traced } from "@/lib/telemetry";
import { Project } from "@/lib/types";
import { saveProjectDB } from "@/lib/supabase/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { monetizationEngine } from "@/lib/monetization";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;


/** Throttle between agent calls to avoid rate limits on free-tier LLM providers */
const AGENT_THROTTLE_MS = 3000;
function agentThrottle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, AGENT_THROTTLE_MS));
}

/**
 * Lazy-load heavy agent modules to reduce webpack memory during build.
 * Each agent is only imported when the route is actually invoked.
 */
async function loadAgents() {
  const [
    { classifyIntent },
    { runScoutAgent },
    { runArchitectAgent },
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
    classifyIntent, runScoutAgent, runArchitectAgent, runChroniclerAgent,
    runPhantom, runHerald, runOverseerAgent, PHASE_19_SYSTEM_PROMPT,
    runSecurityAudit, runSentinelAgent, runEconomyAgent, runBrokerAgent, runLegalAgent,
  };
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  // Rate Limit
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success, limit, remaining, reset } = await rateLimit(ip, 5, 60000);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Neural bridge cooling down." },
      { 
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        }
      }
    );
  }

  return traced("manifestationPipeline", {}, async (span) => {
    try {
      const agents = await loadAgents();

      const body = await request.json().catch(() => ({}));
      const { prompt, orgId, options } = body;

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      span.attributes["project.prompt"] = prompt;
      span.attributes["project.org_id"] = orgId;

      const classification = await traced("agent.classifier", { "agent.role": "Classifier" }, () => agents.classifyIntent(prompt));
      const mode = options?.mode || classification.mode;
      const protocol = options?.protocol || classification.protocol;

      span.attributes["project.mode"] = mode;
      span.attributes["project.protocol"] = protocol;

      const baseManifestationCost = mode === "elite" ? 100 : 50;
      const dynamicCost = monetizationEngine.calculateManifestationCost(baseManifestationCost);

      if (orgId) {
        const { data: org, error: orgError } = await supabaseAdmin
          .from("organizations")
          .select("credit_balance")
          .eq("id", orgId)
          .single();

        if (orgError || !org) {
          return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        if (Number(org.credit_balance) < dynamicCost) {
          return NextResponse.json({ 
            error: `Insufficient credits. Current cost (with ${monetizationEngine.getSurgeMultiplier()}x surge) is ${dynamicCost} neural units.` 
          }, { status: 402 });
        }
      }

      await agentThrottle();
      const strategy = await traced("agent.scout", { "agent.role": "Scout" }, () => agents.runScoutAgent(prompt, protocol));
      await agentThrottle();
      const architecture = await traced("agent.architect", { "agent.role": "Architect" }, () => agents.runArchitectAgent(prompt, strategy.strategyMarkdown));

      const visualTokens = {
        theme: options?.theme || "dark",
        primaryColor: options?.primaryColor || "#f59e0b",
        fontFamily: "Inter, sans-serif"
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

USER REQUEST: "${prompt}"
      `;

      await agentThrottle();
      const res = await traced("agent.developer", { "agent.role": "Developer" }, async () => {
        const fetchRes = await fetch(`${request.nextUrl.origin}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": request.headers.get("authorization") || `Internal ${process.env.E2E_TEST_SECRET || "server-call"}`,
            ...(request.headers.get("cookie") ? { "Cookie": request.headers.get("cookie")! } : {}),
          },
          body: JSON.stringify({ prompt: finalPrompt, multiFile: true, orgId }),
        });
        if (!fetchRes.ok) { const errBody = await fetchRes.text().catch(() => "no body"); console.error(`[Manifest] /api/generate returned ${fetchRes.status}:`, errBody); throw new Error(`Generation failed at Developer layer (${fetchRes.status}): ${errBody}`); }
        return fetchRes.json();
      });

      const genData = res;
      const files = genData.files;

      // Run post-generation agents in parallel to reduce total time & serial rate-limit pressure
      await agentThrottle();
      const [docs, security, sentinel, simulation] = await Promise.all([
        traced("agent.chronicler", { "agent.role": "Chronicler" }, () => agents.runChroniclerAgent(files)),
        traced("agent.security", { "agent.role": "Security" }, () => agents.runSecurityAudit(files)),
        traced("agent.sentinel", { "agent.role": "Sentinel" }, () => agents.runSentinelAgent(files)),
        traced("agent.phantom", { "agent.role": "Phantom" }, () => agents.runPhantom({ files, id: "temp", createdAt: new Date().toISOString() } as Project)),
      ]);
      await agentThrottle();
      const launch = await traced("agent.herald", { "agent.role": "Herald" }, () => agents.runHerald({
        description: genData.description || prompt,
        files,
        id: "temp",
        createdAt: new Date().toISOString(),
        manifest: { strategy: strategy.strategyMarkdown, docs: docs as unknown as Record<string, unknown>, mode, protocol }
      } as unknown as Project));

      await agentThrottle();
      const projectName = (genData.description || "Untitled").split("\n")[0].slice(0, 100);
      const projectDesc = genData.description || prompt;

      // Run economy + legal in parallel (independent of each other)
      const [economy, legal] = await Promise.all([
        traced("agent.economy", { "agent.role": "Economy" }, () => agents.runEconomyAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol }
        } as unknown as Project)),
        traced("agent.legal", { "agent.role": "Legal" }, () => agents.runLegalAgent({
          name: projectName,
          description: projectDesc,
          manifest: { protocol }
        } as unknown as Project)),
      ]);

      let broker: { mergerPotential: { targetProjectId: string; compatibility: number; strategy: string }[]; negotiationStrategy: string } = { mergerPotential: [], negotiationStrategy: "Audit pending." };
      if (orgId) {
        await agentThrottle();
        const { data: existingProjects } = await supabaseAdmin
          .from("projects")
          .select("*")
          .eq("org_id", orgId)
          .limit(10);
        
        broker = await traced("agent.broker", { "agent.role": "Broker" }, () => agents.runBrokerAgent({
          description: projectDesc,
          id: "temp"
        } as unknown as Project, existingProjects || []));
      }

      await agentThrottle();
      const qaResult = await traced("agent.overseer", { "agent.role": "Overseer" }, () => agents.runOverseerAgent({
        ...genData,
        files,
        id: "temp",
        createdAt: new Date().toISOString(),
        manifest: { strategy: strategy.strategyMarkdown, docs, mode, protocol }
      } as unknown as Project));

      const projectData: Partial<Project> = {
        id: crypto.randomUUID(),
        files,
        description: genData.description || prompt,
        orgId,
        createdAt: new Date().toISOString(),
        manifest: {
          mode,
          protocol,
          strategy: strategy.strategyMarkdown,
          docs,
          simulation,
          launch,
          visuals: visualTokens,
          security: {
            ...(security || {}),
            auditLog: (security?.vulnerabilities || []).map((v: { severity?: string; type?: string; description?: string }) => `${v.severity?.toUpperCase?.() || 'UNKNOWN'}: ${v.type || 'unknown'} - ${v.description || 'No description'}`),
            lastScanAt: new Date().toISOString()
          },
          sentinel,
          economy,
          broker,
          legal,
          qa: {
            status: qaResult?.status === "pass" ? "pass" : "fail",
            lastRunAt: new Date().toISOString(),
            errors: (qaResult?.testSteps || []).filter((s: { result?: string }) => s.result === "failure").map((s: { error?: string; step?: string }) => s.error || s.step || "unknown"),
            reportUrl: "/dashboard/qa/" + crypto.randomUUID(),
          },
          monetization: {
            affiliateCut: 0.20,
            revenueShareActive: true
          }
        },
      };

      const savedProject = await saveProjectDB(projectData as Project);

      if (orgId) {
        await supabaseAdmin.rpc("decrement_org_balance", {
          org_id: orgId,
          amount: dynamicCost
        });
      }

      return NextResponse.json({ success: true, project: savedProject });

    } catch (error) {
      console.error("[Manifestation] Build Failed:", error);
      span.end(error as Error);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  });
}
