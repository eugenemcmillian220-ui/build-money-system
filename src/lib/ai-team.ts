/**
 * AI Team Module for Phase 6 - Autonomous AI Company Builder
 * Simulates a full AI-powered product team with specialized roles
 */

export type TeamRole = 'pm' | 'engineer' | 'designer' | 'marketer' | 'analyst';

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

const ROLE_DEFINITIONS: Record<TeamRole, RoleDefinition> = {
  pm: {
    title: 'Product Manager',
    responsibilities: ['Define requirements', 'Prioritize features', 'Write PRDs', 'Manage roadmap'],
    outputType: 'Product requirements and roadmap',
  },
  engineer: {
    title: 'Software Engineer',
    responsibilities: ['Build features', 'Write tests', 'Code review', 'Architecture design'],
    outputType: 'Production-ready code and technical documentation',
  },
  designer: {
    title: 'UX/UI Designer',
    responsibilities: ['Wireframes', 'Design system', 'User flows', 'Prototypes'],
    outputType: 'Design files and component library',
  },
  marketer: {
    title: 'Growth Marketer',
    responsibilities: ['Content strategy', 'SEO', 'Campaign management', 'Analytics'],
    outputType: 'Marketing strategy and content calendar',
  },
  analyst: {
    title: 'Data Analyst',
    responsibilities: ['KPI tracking', 'User research', 'A/B testing', 'Performance reports'],
    outputType: 'Analytics dashboards and insights reports',
  },
};

function buildArtifacts(role: TeamRole, input: unknown): string[] {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const base: Record<TeamRole, string[]> = {
    pm: [`PRD for: ${inputStr.slice(0, 40)}`, 'Feature backlog', 'Sprint plan'],
    engineer: ['Source code modules', 'Unit tests', 'API documentation'],
    designer: ['Figma wireframes', 'Component specs', 'Design tokens'],
    marketer: ['Content calendar', 'SEO strategy', 'Launch plan'],
    analyst: ['KPI dashboard', 'User funnel report', 'A/B test plan'],
  };
  return base[role];
}

export class AITeam {
  async runTeamTasks(tasks: RoleTask[]): Promise<TeamResult[]> {
    return Promise.all(tasks.map(task => this.assignRole(task.role, task.input)));
  }

  async assignRole(role: TeamRole, input: unknown): Promise<TeamResult> {
    const definition = ROLE_DEFINITIONS[role];
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);

    return {
      role,
      result: `${definition.title} completed task. Output: ${definition.outputType}. Input processed: ${inputStr.slice(0, 60)}`,
      artifacts: buildArtifacts(role, input),
      completedAt: new Date().toISOString(),
    };
  }

  getRoleDefinition(role: TeamRole): RoleDefinition {
    return ROLE_DEFINITIONS[role];
  }

  getAllRoles(): TeamRole[] {
    return Object.keys(ROLE_DEFINITIONS) as TeamRole[];
  }
}

export const aiTeam = new AITeam();
