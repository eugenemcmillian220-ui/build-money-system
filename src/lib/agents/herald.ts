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
  const systemPrompt = `You are "The Herald", the Growth & Marketing Lead for Sovereign Forge OS (2026).
    Your goal is to generate a multi-channel viral launch campaign for: ${project.name}.
    
    Project Description: ${project.description}
    
    You must produce:
    1. X/Twitter Thread: A high-engagement thread with a killer hook and value-driven posts.
    2. Product Hunt Assets: Optimized tagline, description, and an authentic maker comment.
    3. SEO-Optimized Article: A long-form blog post targeting relevant keywords to drive organic traffic.
    4. Hype Engine Strategy: A list of niche launch sites and viral hooks tailored to the project's target audience.
    5. Social Media Posts: Short-form content for LinkedIn, Instagram, and TikTok.
    
    Return JSON ONLY:
    {
      "socialThread": { "hook": "Viral hook for X", "posts": ["Post 1", "Post 2", "Post 3"] },
      "productHunt": { "tagline": "Catchy tagline", "description": "Compelling description", "makerComment": "Authentic story about the project" },
      "seoArticle": { "title": "Keyword-rich title", "content": "Full markdown content of the article", "keywords": ["keyword1", "keyword2"] },
      "hypeEngine": {
        "launchSites": [{ "name": "Site Name", "url": "URL", "strategy": "Specific submission strategy" }],
        "viralHooks": ["Hook 1", "Hook 2"]
      },
      "socialPosts": [
        { "platform": "LinkedIn", "hook": "Professional post content" },
        { "platform": "TikTok", "hook": "Script for a short video" }
      ]
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
