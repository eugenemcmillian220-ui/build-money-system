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

      const strategy = await traced("agent.scout", { "agent.role": "Scout" }, () => agents.runScoutAgent(prompt, protocol));
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

      const res = await traced("agent.developer", { "agent.role": "Developer" }, async () => {
        const fetchRes = await fetch(`${request.nextUrl.origin}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(request.headers.get("authorization") ? { "Authorization": request.headers.get("authorization")! } : {}),
            ...(request.headers.get("cookie") ? { "Cookie": request.headers.get("cookie")! } : {}),
          },
          body: JSON.stringify({ prompt: finalPrompt, multiFile: true, orgId }),
        });
        if (!fetchRes.ok) throw new Error("Generation failed at Developer layer");
        return fetchRes.json();
      });

      const genData = res;
      const files = genData.result?.files;

      const docs = await traced("agent.chronicler", { "agent.role": "Chronicler" }, () => agents.runChroniclerAgent(files));
      const security = await traced("agent.security", { "agent.role": "Security" }, () => agents.runSecurityAudit(files));
      const sentinel = await traced("agent.sentinel", { "agent.role": "Sentinel" }, () => agents.runSentinelAgent(files));
      const simulation = await traced("agent.phantom", { "agent.role": "Phantom" }, () => agents.runPhantom({ files, id: "temp", createdAt: new Date().toISOString() } as Project));
      const launch = await traced("agent.herald", { "agent.role": "Herald" }, () => agents.runHerald({
        description: genData.result?.description || prompt,
        files,
        id: "temp",
        createdAt: new Date().toISOString(),
        manifest: { strategy: strategy.strategyMarkdown, docs: docs as unknown as Record<string, unknown>, mode, protocol }
      } as unknown as Project));

      const economy = await traced("agent.economy", { "agent.role": "Economy" }, () => agents.runEconomyAgent({
        name: (genData.result?.description || "Untitled").split("\n")[0].slice(0, 100),
        description: genData.result?.description || prompt,
        manifest: { protocol }
      } as unknown as Project));

      let broker: any = { mergerPotential: [], negotiationStrategy: "Audit pending." };
      if (orgId) {
        const { data: existingProjects } = await supabaseAdmin
          .from("projects")
          .select("*")
          .eq("org_id", orgId)
          .limit(10);
        
        broker = await traced("agent.broker", { "agent.role": "Broker" }, () => agents.runBrokerAgent({
          description: genData.result?.description || prompt,
          id: "temp"
        } as unknown as Project, existingProjects || []));
      }

      const legal = await traced("agent.legal", { "agent.role": "Legal" }, () => agents.runLegalAgent({
        name: (genData.result?.description || "Untitled").split("\n")[0].slice(0, 100),
        description: genData.result.description || prompt,
        manifest: { protocol }
      } as unknown as Project));

      const qaResult = await traced("agent.overseer", { "agent.role": "Overseer" }, () => agents.runOverseerAgent({
        ...(genData.result || {}),
        files,
        id: "temp",
        createdAt: new Date().toISOString(),
        manifest: { strategy: strategy.strategyMarkdown, docs, mode, protocol }
      } as unknown as Project));

      const projectData: Partial<Project> = {
        id: crypto.randomUUID(),
        files,
        description: genData.result.description || prompt,
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
            auditLog: (security?.vulnerabilities || []).map((v: any) => `${v.severity?.toUpperCase?.() || 'UNKNOWN'}: ${v.type || 'unknown'} - ${v.description || 'No description'}`),
            lastScanAt: new Date().toISOString()
          },
          sentinel,
          economy,
          broker,
          legal,
          qa: {
            status: qaResult?.status === "pass" ? "pass" : "fail",
            lastRunAt: new Date().toISOString(),
            errors: (qaResult?.testSteps || []).filter((s: any) => s.result === "failure").map((s: any) => s.error || s.step),
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
