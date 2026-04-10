import { callLLM } from "../llm";
import { Project, heraldResultSchema } from "../types";

export interface SocialPost {
  platform: string;
  hook: string;
}

export interface LaunchAssets {
  twitterThread: { hook: string; posts: string[] };
  productHunt: { tagline: string; description: string; makerComment: string };
  seoArticle: { title: string; content: string; keywords: string[] };
  socialPosts?: SocialPost[];
}

export async function runHerald(project: Project): Promise<LaunchAssets> {
  const systemPrompt = `You are The Herald. Generate high-impact marketing assets for: ${project.name}.
Project Description: ${project.description}
Return JSON ONLY:
{
  "twitterThread": { "hook": "...", "posts": ["...", "..."] },
  "productHunt": { "tagline": "...", "description": "...", "makerComment": "..." },
  "seoArticle": { "title": "...", "content": "...", "keywords": ["...", "..."] }
}`;

  const response = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: "Generate launch assets." }
  ], { temperature: 0.7 });

  try {
    const parsed = JSON.parse(response);
    const data = heraldResultSchema.parse({
      ...parsed,
      socialPosts: [{ platform: "X", hook: parsed.twitterThread?.hook || "" }]
    });
    return data as LaunchAssets;
  } catch {
    console.error("Herald parse failed, falling back to defaults.");
    return {
      twitterThread: { hook: "Exciting new launch!", posts: ["Check it out!"] },
      productHunt: { tagline: "Next-gen AI app", description: "Built with Build Money System", makerComment: "Hello world!" },
      seoArticle: { title: "How to use AI", content: "AI is the future.", keywords: ["AI", "Tech"] }
    };
  }
}
