/**
 * AI Team Module - Phase 5/6 Upgrade
 * Real LLM-powered team simulation (replaces hardcoded string outputs)
 */

import { callLLM } from "./llm";

export type TeamRole = "pm" | "engineer" | "designer" | "marketer" | "analyst";

export interface RoleTask {
  role: TeamRole;
  input: unknown;
}

export interface TeamResult {
  role: TeamRole;
  result: string;
  artifacts: string[];
  completedAt: string;
}

export interface RoleDefinition {
  title: string;
  responsibilities: string[];
  outputType: string;
}

const ROLE_SYSTEM_PROMPTS: Record<TeamRole, string> = {
  pm: `You are a Senior Product Manager at a top-tier startup. Given a product plan or idea, produce a concise Product Requirements Document (PRD) with:
- Problem statement
- Target user and their top 3 pain points
- Top 5 prioritized features (with brief rationale)
- Success metrics (KPIs)
- Out of scope items
Be specific, opinionated, and avoid vague statements.`,

  engineer: `You are a Staff Software Engineer. Given a product plan, produce a technical architecture document with:
- Recommended tech stack with rationale
- System architecture overview (components, data flow)
- Database schema outline
- Key API endpoints (method, path, purpose)
- Top 3 technical risks and mitigations
- Estimated engineering effort (S/M/L/XL)
Be concrete and opinionated.`,

  designer: `You are a Senior UX/UI Designer. Given a product plan, produce a design brief with:
- Key user flows (3-5 steps each for main journeys)
- Component list for the design system
- Color palette and typography recommendations
- Key screens to design first (prioritized list)
- Accessibility considerations
- Design success metrics`,

  marketer: `You are a Head of Growth at a B2B SaaS startup. Given a product or idea, produce a go-to-market strategy with:
- Target ICP (Ideal Customer Profile) with firmographics and psychographics
- Top 3 acquisition channels with estimated CAC
- Launch week content plan (what to post, where, when)
- Key messaging pillars (3 core messages)
- Competitive positioning statement
- 30/60/90 day growth milestones`,

  analyst: `You are a Senior Data Analyst. Given a product or idea, produce an analytics strategy with:
- North Star Metric and why
- 5 key supporting metrics to track
- Recommended analytics stack (tools)
- Funnel definition (acquisition → activation → retention → revenue → referral)
- A/B test ideas for first 90 days
- Data collection requirements`,
};

const ROLE_DEFINITIONS: Record<TeamRole, RoleDefinition> = {
  pm: {
    title: "Product Manager",
    responsibilities: ["Define requirements", "Prioritize features", "Write PRDs", "Manage roadmap"],
    outputType: "Product requirements and roadmap",
  },
  engineer: {
    title: "Software Engineer",
    responsibilities: ["Build features", "Write tests", "Code review", "Architecture design"],
    outputType: "Technical architecture and code",
  },
  designer: {
    title: "UX/UI Designer",
    responsibilities: ["Wireframes", "Design system", "User flows", "Prototypes"],
    outputType: "Design brief and component specs",
  },
  marketer: {
    title: "Growth Marketer",
    responsibilities: ["Content strategy", "SEO", "Campaign management", "Analytics"],
    outputType: "Go-to-market strategy",
  },
  analyst: {
    title: "Data Analyst",
    responsibilities: ["KPI tracking", "User research", "A/B testing", "Performance reports"],
    outputType: "Analytics strategy and KPI framework",
  },
};

export class AITeam {
  async runTeamTasks(tasks: RoleTask[]): Promise<TeamResult[]> {
    // Run in parallel for speed
    return Promise.all(tasks.map((task) => this.assignRole(task.role, task.input)));
  }

  async assignRole(role: TeamRole, input: unknown): Promise<TeamResult> {
    const systemPrompt = ROLE_SYSTEM_PROMPTS[role];
    const inputStr = typeof input === "string" ? input : JSON.stringify(input, null, 2);

    const prompt = `${systemPrompt}

Input/Context:
${inputStr}

Provide your professional output now. Be specific, actionable, and thorough.`;

    try {
      const result = await callLLM([{ role: "user", content: prompt }], { temperature: 0.6 });
      const artifacts = this.extractArtifacts(role, result);

      return {
        role,
        result,
        artifacts,
        completedAt: new Date().toISOString(),
      };
    } catch {
      const definition = ROLE_DEFINITIONS[role];
      return {
        role,
        result: `${definition.title} analysis unavailable — AI service temporarily unreachable. Please retry.`,
        artifacts: [],
        completedAt: new Date().toISOString(),
      };
    }
  }

  private extractArtifacts(role: TeamRole, result: string): string[] {
    // Extract meaningful artifacts from LLM output based on role
    const lines = result.split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("•"));
    const artifacts = lines.slice(0, 5).map((l) => l.replace(/^[-•]\s*/, "").trim());

    if (artifacts.length === 0) {
      const defaults: Record<TeamRole, string[]> = {
        pm: ["PRD Document", "Feature Backlog", "Sprint Plan"],
        engineer: ["Architecture Doc", "API Spec", "Tech Stack Decision"],
        designer: ["User Flow Diagrams", "Component Library", "Design Tokens"],
        marketer: ["GTM Strategy", "Content Calendar", "Channel Mix"],
        analyst: ["KPI Dashboard", "Funnel Definition", "A/B Test Plan"],
      };
      return defaults[role];
    }

    return artifacts;
  }

  getRoleDefinition(role: TeamRole): RoleDefinition {
    return ROLE_DEFINITIONS[role];
  }

  getAllRoles(): TeamRole[] {
    return Object.keys(ROLE_DEFINITIONS) as TeamRole[];
  }
}

export const aiTeam = new AITeam();
