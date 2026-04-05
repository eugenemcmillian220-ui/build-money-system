import { callLLM, cleanJson } from "./llm";
import { Project } from "./types";
import { supabaseAdmin } from "./supabase/db";

export interface AdCreative {
  platform: "meta" | "google" | "x";
  headline: string;
  body: string;
  budgetCredits: number;
}

/**
 * Ad Agent: Autonomously manages paid traffic and PPC campaigns
 */
export class AdAgent {
  /**
   * Generates high-performance ad creatives and sets budgets
   */
  async generateAdCampaign(project: Project): Promise<AdCreative[]> {
    const systemPrompt = `You are a Performance Marketing Specialist. 
    Generate 3 high-converting ad creatives for a new software project.
    
    Description: ${project.description || "Next.js 15 Full-Stack App"}
    Integrations: ${project.integrations?.join(", ") || "AI, Supabase, Stripe"}
    Goal: Maximize sign-ups.
    
    Return ONLY a JSON array:
    [
      { "platform": "meta", "headline": "...", "body": "...", "budgetCredits": 500 }
    ]`;

    const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Action: Create ads." }], { temperature: 0.3 });
    return JSON.parse(cleanJson(response));
  }

  /**
   * Deploys and persists the ad campaign
   */
  async launchCampaign(projectId: string, ads: AdCreative[]): Promise<void> {
    if (!supabaseAdmin) return;

    for (const ad of ads) {
      await supabaseAdmin.from("ad_campaigns").insert({
        project_id: projectId,
        platform: ad.platform,
        ad_copy: `${ad.headline}\n\n${ad.body}`,
        budget_credits: ad.budgetCredits,
        status: "active"
      });
    }
  }
}

export const adAgent = new AdAgent();
