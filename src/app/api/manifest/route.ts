import { NextRequest, NextResponse } from "next/server";
import { classifyIntent } from "@/lib/agents/classifier";
import { runScoutAgent } from "@/lib/agents/scout";
import { runChroniclerAgent } from "@/lib/agents/chronicler";
import { runPhantom } from "@/lib/agents/phantom";
import { runHerald } from "@/lib/agents/herald";
import { PHASE_19_SYSTEM_PROMPT } from "@/lib/prompts/phase-19";
import { Project } from "@/lib/types";
import { saveProjectDB } from "@/lib/supabase/db";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { traced } from "@/lib/telemetry";
import { rateLimit } from "@/lib/rate-limit";
import { runSecurityAudit } from "@/lib/agents/security";
import { runSentinelAgent } from "@/lib/agents/sentinel";
import { runEconomyAgent } from "@/lib/agents/economy";
import { runBrokerAgent } from "@/lib/agents/broker";
import { runLegalAgent } from "@/lib/agents/legal";
import { monetizationEngine } from "@/lib/monetization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Rate Limit
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success, limit, remaining, reset } = rateLimit(ip, 5, 60000); // 5 requests per minute

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
      const body = await request.json().catch(() => ({}));
      const { prompt, orgId, options } = body;

      if (!prompt) {
        return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
      }

      span.attributes["project.prompt"] = prompt;
      span.attributes["project.org_id"] = orgId;

      // STEP 0: CREDIT CHECK (Phase 10 Economy & Phase 6 Surge)
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

      // STEP 1: INTENT CLASSIFICATION
      const classification = await traced("agent.classifier", { "agent.role": "Classifier" }, () => classifyIntent(prompt));
      const mode = options?.mode || classification.mode;
      const protocol = options?.protocol || classification.protocol;

      span.attributes["project.mode"] = mode;
      span.attributes["project.protocol"] = protocol;

      // STEP 2: THE SCOUT (Pre-generation Research)
      const strategy = await traced("agent.scout", { "agent.role": "Scout" }, () => runScoutAgent(prompt, protocol));

      // STEP 3: THE ARCHITECT (Visual Engine Expansion)
      // For simulation, we assume Developer will handle the prompt. 
      // In Ph 1-3, we now inject visual tokens.
      const visualTokens = {
        theme: options?.theme || "dark",
        primaryColor: options?.primaryColor || "#f59e0b",
        fontFamily: "Inter, sans-serif"
      };

      const finalPrompt = `
${PHASE_19_SYSTEM_PROMPT}

BUILD CONTEXT:
Mode: ${mode.toUpperCase()}
Protocol: ${protocol.toUpperCase()}
Visual Theme: ${visualTokens.theme} (Primary: ${visualTokens.primaryColor})

STRATEGY:
${strategy.strategyMarkdown}

USER REQUEST: "${prompt}"
      `;

      // STEP 4: THE DEVELOPER (Generate Files)
      const res = await traced("agent.developer", { "agent.role": "Developer" }, async () => {
        const fetchRes = await fetch(`${request.nextUrl.origin}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: finalPrompt, multiFile: true, orgId }),
        });
        if (!fetchRes.ok) throw new Error("Generation failed at Developer layer");
        return fetchRes.json();
      });

      const genData = res;
      const files = genData.result?.files;

      // STEP 5: THE CHRONICLER
      const docs = await traced("agent.chronicler", { "agent.role": "Chronicler" }, () => runChroniclerAgent(files));

      // STEP 6: PHASE 8-10 - THE SECURITY AUDITOR
      const security = await traced("agent.security", { "agent.role": "Security" }, () => runSecurityAudit(files));

      // STEP 6.1: PHASE 4 - THE SENTINEL
      const sentinel = await traced("agent.sentinel", { "agent.role": "Sentinel" }, () => runSentinelAgent(files));

      // STEP 7: PHASE 20 - THE PHANTOM
      const simulation = await traced("agent.phantom", { "agent.role": "Phantom" }, () => runPhantom({ files, id: "temp", createdAt: new Date().toISOString() } as Project));

      // STEP 8: PHASE 20 - THE HERALD
      const launch = await traced("agent.herald", { "agent.role": "Herald" }, () => runHerald({
        description: genData.result.description || prompt,
        files,
        id: "temp",
        createdAt: new Date().toISOString(),
        manifest: { strategy: strategy.strategyMarkdown, docs: docs as unknown as Record<string, unknown>, mode, protocol }
      } as unknown as Project));

      // STEP 8.1: PHASE 10 & 13 - THE AUDITOR OF ECONOMY
      const economy = await traced("agent.economy", { "agent.role": "Economy" }, () => runEconomyAgent({
        name: genData.result.description?.split("\n")[0].slice(0, 100),
        description: genData.result.description || prompt,
        manifest: { protocol }
      } as unknown as Project));

      // STEP 8.2: PHASE 14 & 16 - THE EMPIRE BROKER
      let broker = { mergerPotential: [], negotiationStrategy: "Audit pending." };
      if (orgId) {
        const { data: existingProjects } = await supabaseAdmin
          .from("projects")
          .select("*")
          .eq("org_id", orgId)
          .limit(10);
        
        broker = await traced("agent.broker", { "agent.role": "Broker" }, () => runBrokerAgent({
          description: genData.result.description || prompt,
          id: "temp"
        } as unknown as Project, existingProjects || []));
      }

      // STEP 8.3: PHASE 17 - THE LEGAL VAULT
      const legal = await traced("agent.legal", { "agent.role": "Legal" }, () => runLegalAgent({
        name: genData.result.description?.split("\n")[0].slice(0, 100),
        description: genData.result.description || prompt,
        manifest: { protocol }
      } as unknown as Project));

      // STEP 9: PERSISTENCE
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
            ...security,
            auditLog: security.vulnerabilities.map(v => `${v.severity.toUpperCase()}: ${v.type} - ${v.description}`),
            lastScanAt: new Date().toISOString()
          },
          sentinel,
          economy,
          broker,
          legal,
          monetization: {
            affiliateCut: 0.20,
            revenueShareActive: true
          }
        },
      };

      const savedProject = await saveProjectDB(projectData as Project);

      // STEP 10: CREDIT DEDUCTION (Phase 10 Economy & Phase 6 Surge)
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
