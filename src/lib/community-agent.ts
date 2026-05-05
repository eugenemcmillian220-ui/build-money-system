import { callLLM, cleanJson } from "./llm";
import { Project } from "./types";
import { supabaseAdmin } from "./supabase/db";

export interface CommunityResponse {
  answer: string;
  suggestedAction?: string;
  sentiment: "positive" | "neutral" | "negative";
}

/**
 * Community Agent: Autonomously manages Discord/Slack user communities
 */
export class CommunityAgent {
  /**
   * Responds to a user query in a community channel using project context
   */
  async handleUserQuery(project: Project, query: string): Promise<CommunityResponse> {
    const systemPrompt = `You are an Autonomous Community Manager for a new software project.
    Project Info: ${project.description || "Next.js 15 Full-Stack App"}
    Integrations: ${project.integrations?.join(", ") || "AI, Supabase, Stripe"}
    
    Answer the user query professionally. If they are asking for a feature, suggest they check the roadmap. 
    If they are frustrated, offer a small 'Agent Credit' reward (simulated).
    
    Return ONLY a JSON object:
    { "answer": "...", "suggestedAction": "...", "sentiment": "positive" }`;

    try {
      const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: query }], { temperature: 0.5 });
      return JSON.parse(cleanJson(response));
    } catch (err) {
      console.error("[CommunityAgent] Query handling failed:", err);
      return {
        answer: "Thanks for reaching out! Our team is looking into this. Please check back shortly or visit our documentation for more info.",
        suggestedAction: "Review documentation",
        sentiment: "neutral"
      };
    }
  }

  /**
   * Deploys a new community management instance
   */
  async deployChannel(projectId: string, platform: "discord" | "slack", externalId: string): Promise<void> {
    if (!supabaseAdmin) return;

    await supabaseAdmin.from("community_channels").insert({
      project_id: projectId,
      platform,
      channel_id: externalId,
      auto_welcome: true,
      auto_support: true
    });
  }
}

export const communityAgent = new CommunityAgent();
