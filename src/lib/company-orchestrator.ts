/**
 * Company Orchestrator Module for Phase 6 - Autonomous AI Company Builder
 * Orchestrates the full pipeline: idea validation → product planning → AI team → growth → monetization
 */

import { IdeaValidator, IdeaValidationResult, ideaValidator } from './idea-validator';
import { ProductPlanner, ProductPlan, productPlanner } from './product-planner';
import { AITeam, TeamResult, aiTeam } from './ai-team';
import { GrowthEngine, GrowthStrategy, growthEngine } from './growth-engine';
import { MonetizationEngine, MonetizationPlan, monetizationEngine } from './monetization';
import { analyticsEngine } from './analytics';

export interface CompanyBuildResult {
  idea: string;
  validation: IdeaValidationResult;
  plan: ProductPlan;
  teamOutput: TeamResult[];
  growth: GrowthStrategy;
  revenue: MonetizationPlan;
  buildId: string;
  completedAt: string;
  viable: boolean;
}

export class CompanyOrchestrator {
  private ideaValidator: IdeaValidator;
  private productPlanner: ProductPlanner;
  private aiTeam: AITeam;
  private growthEngine: GrowthEngine;
  private monetizationEngine: MonetizationEngine;

  constructor() {
    this.ideaValidator = ideaValidator;
    this.productPlanner = productPlanner;
    this.aiTeam = aiTeam;
    this.growthEngine = growthEngine;
    this.monetizationEngine = monetizationEngine;
  }

  async buildCompany(idea: string): Promise<CompanyBuildResult> {
    const buildId = Math.random().toString(36).substring(2, 11);

    analyticsEngine.trackMetric({ name: 'company_build_started', value: 1, metadata: { idea, buildId } });

    const validation = this.ideaValidator.validateIdea(idea);

    const plan = this.productPlanner.planProduct(idea);

    const teamOutput = await this.aiTeam.runTeamTasks([
      { role: 'pm', input: plan },
      { role: 'engineer', input: plan },
      { role: 'designer', input: plan },
      { role: 'marketer', input: idea },
      { role: 'analyst', input: idea },
    ]);

    const growth = this.growthEngine.launchGrowth(idea);

    const revenue = this.monetizationEngine.startMonetization(idea);

    analyticsEngine.trackMetric({
      name: 'company_build_completed',
      value: 1,
      metadata: { idea, buildId, score: validation.score },
    });

    return {
      idea,
      validation,
      plan,
      teamOutput,
      growth,
      revenue,
      buildId,
      completedAt: new Date().toISOString(),
      viable: validation.verdict !== 'Not Viable',
    };
  }

  async validateOnly(idea: string): Promise<IdeaValidationResult> {
    return this.ideaValidator.validateIdea(idea);
  }

  async planOnly(idea: string): Promise<ProductPlan> {
    return this.productPlanner.planProduct(idea);
  }
}

export const companyOrchestrator = new CompanyOrchestrator();
