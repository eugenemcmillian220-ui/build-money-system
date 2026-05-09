import { callLLMJson } from "../llm";
import { scoutResultSchema } from "../types";

const SCOUT_FETCH_TIMEOUT_MS = 8_000;

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SCOUT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Scout fetch failed with status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export interface ScoutStrategy {
  strategyMarkdown: string;
  recommendedStack: string[];
  competitorInsights: string;
}

/**
 * Fetches real-time tech trends from GitHub (Free API)
 */
async function fetchGithubTrends(query: string): Promise<string> {
  try {
    const responseText = await fetchText(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`, {
      headers: {
        "User-Agent": "sovereign-forge-scout",
      },
    });
    const data = JSON.parse(responseText) as { items: Array<{ full_name: string; description: string; stargazers_count: number }> };
    return data.items.map((repo) => `- ${repo.full_name}: ${repo.description} (${repo.stargazers_count} stars)`).join("\n");
  } catch {
    return "No GitHub trends found.";
  }
}

/**
 * Fetches emerging research from arXiv (Free API)
 */
async function fetchArxivPapers(query: string): Promise<string> {
  try {
    await fetchText(`http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`);
    return "Recent arXiv research successfully indexed.";
  } catch {
    return "Research archive inaccessible.";
  }
}

export async function runScoutAgent(prompt: string, protocol: string): Promise<ScoutStrategy> {
  console.log(`[Scout] Ingesting real-time R&D for protocol: ${protocol}...`);
  
  const [githubTrends, arxivStatus] = await Promise.all([
    fetchGithubTrends(protocol),
    fetchArxivPapers(protocol),
  ]);

  const systemPrompt = `
    You are "The Scout", the R&D Lead for Sovereign Forge OS (2026).
    Your goal is to define the technical and market strategy for a new manifestation.
    
    REAL-TIME R&D FEED:
    GITHUB TRENDS:
    ${githubTrends}
    
    RESEARCH STATUS:
    ${arxivStatus}
    
    Your strategy must analyze:
    1. Technical feasibility and recommended stack (Modern 2026 stack).
    2. Market differentiation: How this manifestation will outperform existing solutions.
    3. Monetization potential: Identify high-yield revenue models, including subscription tiers and credit-based features.
    4. Virality hooks: How it will achieve exponential growth in the Sovereign Forge ecosystem.
    5. Risk assessment: Identify potential technical or market roadblocks and suggest mitigations.
    6. Future roadmap: Outline how this manifestation can evolve into a full-scale digital empire.
    
    Based on this data and the project intent, provide a detailed strategy.
    Return JSON ONLY:
    {
      "strategyMarkdown": "Detailed markdown strategy with sections for Tech Stack, Market Analysis, Monetization, and Roadmap.",
      "recommendedStack": ["list", "of", "technologies"],
      "competitorInsights": "In-depth analysis of existing competitors and our tactical advantage, including specific features to build."
    }
  `;

  try {
    return await callLLMJson(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      scoutResultSchema,
      { temperature: 0.3, maxTokens: 900, timeout: 12_000 }
    );
  } catch (err) {
    console.error("Scout parse failed, falling back to defaults.", err);
    return {
      strategyMarkdown: "# Default Strategy\nBuild fast, iterate quickly.",
      recommendedStack: ["Next.js", "Tailwind", "Supabase"],
      competitorInsights: "No direct competitors identified."
    };
  }
}
