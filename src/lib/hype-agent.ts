import { callLLM, cleanJson } from "./llm";
import { Project } from "./types";
import { createClient } from "./supabase/server";

export interface SocialPost {
  content: string;
  mediaUrls?: string[];
}

export interface HypeResult {
  success: boolean;
  posts: SocialPost[];
  campaignId: string;
}

/**
 * Hype Agent: Autonomously markets projects on social media
 */
export class HypeAgent {
  /**
   * Generates a viral social media campaign for a project
   */
  async generateCampaign(project: Project): Promise<SocialPost[]> {
    const systemPrompt = `You are a viral marketing specialist and Head of Hype. Your goal is to create a high-engagement social media campaign for a new software project.
    
Project Description: ${project.description || "Next.js 15 Full-Stack App"}
Core Features: ${project.integrations?.join(", ") || "Next.js 15, Tailwind CSS v4, AI-Powered"}
Initial Prompt: ${project.prompt?.substring(0, 200) || "Build a high-potential SaaS"}

Generate a high-impact social media post:
1. A professional viral growth post for high-engagement platforms.

Return ONLY a JSON object:
{
  "posts": [
    { "content": "Post content..." }
  ]
}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: "Generate the campaign now:" }
    ];

    const response = await callLLM(messages, { temperature: 0.8 });
    const result = JSON.parse(cleanJson(response));
    return result.posts;
  }

  /**
   * Executes the campaign by posting to social APIs (mocked for safety)
   */
  async executeCampaign(projectId: string, posts: SocialPost[]): Promise<HypeResult> {
    const supabase = await createClient();
    const campaignId = Math.random().toString(36).substring(2, 11);

    for (const post of posts) {
      console.log(`[HypeAgent] Manifesting viral post...`);
      // In production, this would call the real APIs
      // await this.postToPlatform(post);

      await supabase.from("marketing_posts").insert({
        project_id: projectId,
        content: post.content,
        status: "posted",
        posted_at: new Date().toISOString(),
        external_id: `mock_${Math.random().toString(36).substring(2, 9)}`
      });
    }

    return { success: true, posts, campaignId };
  }

  private async postToPlatform(post: SocialPost): Promise<string> {
    // This is where the real API calls would go
    return `mock_id_social`;
  }
}

export const hypeAgent = new HypeAgent();
