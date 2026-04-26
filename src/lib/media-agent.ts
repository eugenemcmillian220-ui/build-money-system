import { callLLM, cleanJson } from "./llm";
import { Project } from "./types";
import { supabaseAdmin } from "./supabase/db";

export interface VideoScript {
  platform: "tiktok" | "reels" | "shorts";
  hook: string;
  body: string;
  cta: string;
  visualCues: string[];
}

/**
 * Media Agent: Autonomously creates short-form video marketing content
 */
export class MediaAgent {
  /**
   * Generates high-conversion short-form video scripts
   */
  async generateVideoContent(project: Project): Promise<VideoScript[]> {
    const systemPrompt = `You are a viral Short-Form Video Producer (TikTok/Reels). 
    Generate 3 high-energy video scripts for a new software project.
    
    Project Context: ${project.description || "Next.js 15 Full-Stack App"}
    Integrations: ${project.integrations?.join(", ") || "AI, Supabase, Stripe"}
    
    Each script must include:
    1. A "Scroll-Stopping" Hook (first 3 seconds).
    2. Value-driven body text.
    3. A clear CTA.
    4. Visual cues (e.g., "Show Vision-to-Code dashboard here").
    
    Return ONLY a JSON array:
    [
      { "platform": "tiktok", "hook": "...", "body": "...", "cta": "...", "visualCues": ["..."] }
    ]`;

    try {
      const response = await callLLM([{ role: "system", content: systemPrompt }, { role: "user", content: "Action: Produce scripts." }], { temperature: 0.8 });
      return JSON.parse(cleanJson(response));
    } catch (err) {
      console.error("[MediaAgent] Video script generation failed:", err);
      const desc = project.description || "AI-Powered App";
      return [
        { platform: "tiktok", hook: `What if AI could build your entire app?`, body: `${desc} — built autonomously by sovereign AI agents.`, cta: "Link in bio to try it free.", visualCues: ["Show the dashboard", "Quick demo of code generation"] },
        { platform: "reels", hook: `Stop coding. Start commanding.`, body: `From idea to production SaaS in minutes with ${desc}.`, cta: "Follow for more AI dev content.", visualCues: ["Screen recording of app creation"] },
        { platform: "shorts", hook: `This AI just built a full SaaS...`, body: `${desc} — the future of software development.`, cta: "Subscribe to see what it builds next.", visualCues: ["Side-by-side: prompt vs deployed app"] },
      ];
    }
  }

  /**
   * Persists the generated scripts to the database
   */
  async saveScripts(projectId: string, scripts: VideoScript[]): Promise<void> {
    if (!supabaseAdmin) return;

    for (const s of scripts) {
      await supabaseAdmin.from("marketing_videos").insert({
        project_id: projectId,
        platform: s.platform,
        script: `${s.hook}\n\n${s.body}\n\n${s.cta}`,
        status: "ready"
      });
    }
  }
}

export const mediaAgent = new MediaAgent();
