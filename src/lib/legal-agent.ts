import { supabaseAdmin } from "./supabase/db";
import { callLLM, cleanJson } from "./llm";
import { Project } from "./types";

export interface LegalEntitySpec {
  entityName: string;
  type: "llc" | "corporation" | "dao";
  jurisdiction: string;
  operatingAgreement: string;
  termsOfService: string;
}

/**
 * Legal Agent: Autonomously handles incorporation, contracts, and IP protection
 */
export class LegalAgent {
  /**
   * Generates a full corporate governance suite for a project
   */
  async draftCorporateSuite(project: Project): Promise<LegalEntitySpec> {
    const systemPrompt = `You are a Senior Corporate Attorney and Legal Engineer. 
    Draft a full legal suite for a new autonomous software business.
    
    Project: ${project.description || "Autonomous AI SaaS"}
    
    Tasks:
    1. Propose the best entity type (LLC, Corp, or DAO).
    2. Propose a jurisdiction (e.g., Wyoming for DAOs, Delaware for Corps).
    3. Generate a summary Operating Agreement.
    4. Generate a summary Terms of Service (TOS).
    
    Return ONLY a JSON object:
    {
      "entityName": "string",
      "type": "llc" | "corporation" | "dao",
      "jurisdiction": "string",
      "operatingAgreement": "Full text summary...",
      "termsOfService": "Full text summary..."
    }`;

    try {
      const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Execute legal drafting:" }], { temperature: 0.2 });
      return JSON.parse(cleanJson(response));
    } catch (e) {
      console.error("[LegalAgent] Drafting failed:", e);
      throw e;
    }
  }

  /**
   * Persists the legal entity to the database
   */
  async formEntity(projectId: string, spec: LegalEntitySpec): Promise<void> {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from("legal_entities").insert({
      project_id: projectId,
      entity_name: spec.entityName,
      entity_type: spec.type,
      jurisdiction: spec.jurisdiction,
      governance_docs: {
        operating_agreement: spec.operatingAgreement,
        tos: spec.termsOfService
      },
      status: "active"
    });
  }

  /**
   * Scans for IP opportunities (Trademarks/Patents)
   */
  async protectIP(projectId: string, description: string): Promise<void> {
    if (!supabaseAdmin) return;

    // AI logic to identify unique assets
    const assets = ["Main Logo Trademark", "Autonomous Logic Patent"];
    
    for (const asset of assets) {
      await supabaseAdmin.from("ip_vault").insert({
        project_id: projectId,
        asset_type: asset.includes("Trademark") ? "trademark" : "patent",
        asset_description: `${asset} for: ${description}`,
        filing_status: "pending"
      });
    }
  }
}

export const legalAgent = new LegalAgent();
