import { callLLM, cleanJson } from "./llm";
import { Project } from "./types";
import { supabaseAdmin } from "./supabase/db";

export interface LaunchPlan {
  platform: "product_hunt" | "hacker_news" | "indie_hackers";
  title: string;
  body: string;
  launchTime: string;
}

/**
 * Launch Agent: Autonomously handles high-traffic community launches
 */
export class LaunchAgent {
  /**
   * Crafts viral launch pitches for major platforms
   */
  async prepareLaunches(project: Project): Promise<LaunchPlan[]> {
    const systemPrompt = `You are a Launch Orchestrator. 
    Draft 3 viral launch pitches for a new software project.
    
    Description: ${project.description || "Next.js 15 Full-Stack App"}
    Integrations: ${project.integrations?.join(", ") || "AI, Supabase, Stripe"}
    Platforms: Product Hunt, Hacker News, Indie Hackers.
    
    Return ONLY a JSON array:
    [
      { "platform": "product_hunt", "title": "...", "body": "...", "launchTime": "ISO_DATE" }
    ]`;

    const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Action: Draft pitches." }], { temperature: 0.6 });
    return JSON.parse(cleanJson(response));
  }

  /**
   * Schedules and persists the launch plans
   */
  async scheduleLaunches(projectId: string, plans: LaunchPlan[]): Promise<void> {
    if (!supabaseAdmin) return;

    for (const plan of plans) {
      await supabaseAdmin.from("viral_launches").insert({
        project_id: projectId,
        platform: plan.platform,
        pitch_title: plan.title,
        pitch_body: plan.body,
        launch_date: plan.launchTime,
        status: "scheduled"
      });
    }
  }
}

export const launchAgent = new LaunchAgent();
