/**
 * Growth Engine Module - Phase 6 Upgrade
 * Real LLM-powered growth strategy generation (replaces hardcoded channel lists)
 */

import { callLLM, cleanJson } from "./llm";

export interface Channel {
  name: string;
  type: "organic" | "paid" | "partnership" | "product-led";
  estimatedCAC: string;
  timeToFirstResult: string;
  effort: "low" | "medium" | "high";
  tactics: string[];
}

export interface GrowthStrategy {
  idea: string;
  channels: Channel[];
  contentCalendar: ContentItem[];
  viralMechanics: string[];
  milestones: Milestone[];
  partnerships: string[];
  generatedAt: string;
}

export interface ContentItem {
  week: number;
  platform: string;
  type: string;
  topic: string;
}

export interface Milestone {
  day: number;
  goal: string;
  metric: string;
  target: string;
}

export class GrowthEngine {
  async launchGrowth(idea: string): Promise<GrowthStrategy> {
    const prompt = `You are a Head of Growth at a top-tier B2B SaaS company. Create a comprehensive 90-day growth strategy for this product idea.

Product Idea: "${idea}"

Return ONLY a JSON object (no markdown):
{
  "channels": [
    {
      "name": "<channel name>",
      "type": "<organic|paid|partnership|product-led>",
      "estimatedCAC": "<e.g. $45>",
      "timeToFirstResult": "<e.g. 2-4 weeks>",
      "effort": "<low|medium|high>",
      "tactics": ["<specific tactic 1>", "<specific tactic 2>", "<specific tactic 3>"]
    }
  ],
  "contentCalendar": [
    { "week": 1, "platform": "<LinkedIn|Twitter|HackerNews|Reddit>", "type": "<post|thread|article>", "topic": "<specific topic>" }
  ],
  "viralMechanics": ["<built-in viral mechanic 1>", "<viral mechanic 2>"],
  "milestones": [
    { "day": 30, "goal": "<specific goal>", "metric": "<metric name>", "target": "<target value>" },
    { "day": 60, "goal": "<specific goal>", "metric": "<metric name>", "target": "<target value>" },
    { "day": 90, "goal": "<specific goal>", "metric": "<metric name>", "target": "<target value>" }
  ],
  "partnerships": ["<specific partnership opportunity 1>", "<specific partnership 2>", "<specific partnership 3>"]
}

Include 3-5 channels, 8 content calendar items (week 1-4, 2 per week), 3 viral mechanics, 3 milestones, 3 partnerships.`;

    try {
      const response = await callLLM([{ role: "user", content: prompt }], { temperature: 0.5 });
      const parsed = JSON.parse(cleanJson(response)) as Omit<GrowthStrategy, "idea" | "generatedAt">;
      return { idea, ...parsed, generatedAt: new Date().toISOString() };
    } catch {
      return this.fallbackStrategy(idea);
    }
  }

  async generateGrowthStrategy(idea: string): Promise<GrowthStrategy> {
    return this.launchGrowth(idea);
  }

  private fallbackStrategy(idea: string): GrowthStrategy {
    return {
      idea,
      channels: [
        {
          name: "Content Marketing (SEO)",
          type: "organic",
          estimatedCAC: "$20-50",
          timeToFirstResult: "6-8 weeks",
          effort: "medium",
          tactics: ["Weekly blog posts targeting long-tail keywords", "SEO-optimized landing pages", "Developer tutorials"],
        },
        {
          name: "Product Hunt Launch",
          type: "product-led",
          estimatedCAC: "$5-15",
          timeToFirstResult: "1 day",
          effort: "medium",
          tactics: ["Build launch anticipation with teaser posts", "Prepare hunter outreach", "Day-of community engagement"],
        },
      ],
      contentCalendar: [
        { week: 1, platform: "LinkedIn", type: "post", topic: "Problem we are solving" },
        { week: 1, platform: "Twitter", type: "thread", topic: "Behind the build" },
      ],
      viralMechanics: ["Shareable output artifacts", "Team invite system", "Public project gallery"],
      milestones: [
        { day: 30, goal: "First 100 signups", metric: "registered_users", target: "100" },
        { day: 60, goal: "First 10 paying customers", metric: "mrr", target: "$500" },
        { day: 90, goal: "Product-market fit signal", metric: "nps", target: "40+" },
      ],
      partnerships: ["Vercel ecosystem", "Supabase community", "Y Combinator Startup School"],
      generatedAt: new Date().toISOString(),
    };
  }
}

export const growthEngine = new GrowthEngine();
