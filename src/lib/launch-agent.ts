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

    try {
      const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Action: Draft pitches." }], { temperature: 0.6 });
      return JSON.parse(cleanJson(response));
    } catch (err) {
      console.error("[LaunchAgent] Pitch generation failed:", err);
      const desc = project.description || "AI-Powered Full-Stack App";
      return [
        { platform: "product_hunt", title: desc, body: "Ship production apps autonomously with sovereign AI.", launchTime: new Date(Date.now() + 7 * 86400000).toISOString() },
        { platform: "hacker_news", title: `Show HN: ${desc}`, body: "Built with Next.js 15, Supabase, and autonomous AI agents.", launchTime: new Date(Date.now() + 7 * 86400000).toISOString() },
        { platform: "indie_hackers", title: desc, body: "From prompt to production SaaS in minutes.", launchTime: new Date(Date.now() + 7 * 86400000).toISOString() },
      ];
    }
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
