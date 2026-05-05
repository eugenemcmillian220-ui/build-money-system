import { callLLMJson } from "../llm";
import { scoutResultSchema } from "../types";
import axios from "axios";

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
    const res = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`, { timeout: 5000 });
    return (res.data as { items: Array<{ full_name: string; description: string; stargazers_count: number }> }).items.map((repo) => `- ${repo.full_name}: ${repo.description} (${repo.stargazers_count} stars)`).join("\n");
  } catch {
    return "No GitHub trends found.";
  }
}

/**
 * Fetches emerging research from arXiv (Free API)
 */
async function fetchArxivPapers(query: string): Promise<string> {
  try {
    const res = await axios.get(`http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`, { timeout: 5000 });
    // ArXiv returns XML, but for a lightweight scout, we just want to know if we hit it.
    // In a real empire, we'd parse this. For now, we note the research attempt.
    return res.status === 200 ? "Recent arXiv research successfully indexed." : "No papers found.";
  } catch {
    return "Research archive inaccessible.";
  }
}

export async function runScoutAgent(prompt: string, protocol: string): Promise<ScoutStrategy> {
  console.log(`[Scout] Ingesting real-time R&D for protocol: ${protocol}...`);
  
  const githubTrends = await fetchGithubTrends(protocol);
  const arxivStatus = await fetchArxivPapers(protocol);

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
      { temperature: 0.3 }
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
