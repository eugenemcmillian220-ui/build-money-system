import { callLLMJson } from "../llm";
import { Project, heraldResultSchema } from "../types";

export interface SocialPost {
  platform: string;
  hook: string;
}

export type LaunchAssets = {
  socialThread: { hook: string; posts: string[] };
  productHunt: { tagline: string; description: string; makerComment: string };
  seoArticle: { title: string; content: string; keywords: string[] };
  hypeEngine?: {
    launchSites: Array<{ name: string; url: string; strategy: string }>;
    viralHooks: string[];
  };
  socialPosts?: SocialPost[];
} & Record<string, unknown>;

export async function runHerald(project: Project): Promise<LaunchAssets> {
  const systemPrompt = `You are The Herald. Generate high-impact marketing assets for: ${project.name}.
Project Description: ${project.description}
Return JSON ONLY:
{
  "socialThread": { "hook": "...", "posts": ["...", "..."] },
  "productHunt": { "tagline": "...", "description": "...", "makerComment": "..." },
  "seoArticle": { "title": "...", "content": "...", "keywords": ["...", "..."] },
  "hypeEngine": {
    "launchSites": [{ "name": "...", "url": "...", "strategy": "..." }],
    "viralHooks": ["...", "..."]
  }
}`;

  try {
    const parsed = await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate launch assets." }
      ],
      heraldResultSchema,
      { temperature: 0.7 }
    );
    return parsed as LaunchAssets;
  } catch (err) {
    console.error("Herald parse failed, falling back to defaults.", err);
    return {
      socialThread: { hook: "Exciting new launch!", posts: ["Check it out!"] },
      productHunt: { tagline: "Next-gen AI app", description: "Built with Build Money System", makerComment: "Hello world!" },
      seoArticle: { title: "How to use AI", content: "AI is the future.", keywords: ["AI", "Tech"] }
    };
  }
}
