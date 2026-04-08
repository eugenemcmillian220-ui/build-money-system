/**
 * Idea Validator Module - Phase 5/6 Upgrade
 * Real LLM-powered business idea validation
 */

import { callLLM, cleanJson } from "./llm";

export interface IdeaValidationResult {
  idea: string;
  score: number;
  verdict: "Promising" | "Needs Work" | "Not Viable";
  risks: string[];
  suggestions: string[];
  marketSize: "small" | "medium" | "large";
  competitionLevel: "low" | "medium" | "high";
  reasoning: string;
  targetAudience: string;
  uniqueValueProp: string;
  timestamp: string;
}

export interface MarketAnalysis {
  segments: string[];
  targetAudience: string;
  estimatedMarketSize: string;
  growthRate: string;
}

export interface Risk {
  type: string;
  severity: "low" | "medium" | "high";
  mitigation: string;
}

export class IdeaValidator {
  async validateIdea(idea: string): Promise<IdeaValidationResult> {
    const prompt = `You are an expert venture capitalist and startup analyst. Critically analyze this business idea and return a JSON evaluation.

Business Idea: "${idea}"

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "score": <integer 0-100>,
  "verdict": "<Promising|Needs Work|Not Viable>",
  "risks": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<actionable suggestion 3>"],
  "marketSize": "<small|medium|large>",
  "competitionLevel": "<low|medium|high>",
  "reasoning": "<2-3 sentence honest assessment of why this idea has the score it does>",
  "targetAudience": "<specific description of the ideal customer>",
  "uniqueValueProp": "<what genuinely differentiates this from existing solutions>"
}

Scoring guide:
- 80-100: Strong PMF signal, clear market, differentiated
- 60-79: Good idea, needs refinement or validation
- 40-59: Interesting but major challenges to address
- 20-39: Significant structural problems
- 0-19: Not viable as described`;

    try {
      const response = await callLLM([{ role: "user", content: prompt }], { temperature: 0.4 });
      const cleaned = cleanJson(response);
      const parsed = JSON.parse(cleaned) as Omit<IdeaValidationResult, "idea" | "timestamp">;

      return {
        idea,
        ...parsed,
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        idea,
        score: 50,
        verdict: "Needs Work",
        risks: ["Unable to perform full analysis — LLM unavailable"],
        suggestions: ["Retry validation when AI service is available"],
        marketSize: "medium",
        competitionLevel: "medium",
        reasoning: "Analysis could not be completed due to AI service unavailability.",
        targetAudience: "Unknown — analysis failed",
        uniqueValueProp: "Unknown — analysis failed",
        timestamp: new Date().toISOString(),
      };
    }
  }

  async analyzeMarket(idea: string): Promise<MarketAnalysis> {
    const prompt = `Analyze the market for this business idea: "${idea}"

Return ONLY JSON (no markdown):
{
  "segments": ["<segment 1>", "<segment 2>", "<segment 3>"],
  "targetAudience": "<primary ICP description>",
  "estimatedMarketSize": "<TAM estimate with reasoning, e.g. $2.5B TAM>",
  "growthRate": "<realistic YoY growth estimate with basis>"
}`;

    try {
      const response = await callLLM([{ role: "user", content: prompt }], { temperature: 0.4 });
      return JSON.parse(cleanJson(response)) as MarketAnalysis;
    } catch {
      return {
        segments: ["Early adopters", "SMBs", "Enterprise"],
        targetAudience: "Technical professionals and business owners",
        estimatedMarketSize: "Analysis unavailable",
        growthRate: "Analysis unavailable",
      };
    }
  }

  async assessRisks(idea: string): Promise<Risk[]> {
    const prompt = `Identify the top 3-5 risks for this business idea: "${idea}"

Return ONLY a JSON array (no markdown):
[
  {
    "type": "<risk category>",
    "severity": "<low|medium|high>",
    "mitigation": "<specific, actionable mitigation strategy>"
  }
]`;

    try {
      const response = await callLLM([{ role: "user", content: prompt }], { temperature: 0.4 });
      return JSON.parse(cleanJson(response)) as Risk[];
    } catch {
      return [
        {
          type: "market-fit",
          severity: "medium",
          mitigation: "Validate with at least 10 paying customers before scaling",
        },
      ];
    }
  }
}

export const ideaValidator = new IdeaValidator();
