/**
 * Idea Validator Module for Phase 6 - Autonomous AI Company Builder
 * Validates business ideas by scoring viability, identifying risks, and providing suggestions
 */

export interface IdeaValidationResult {
  idea: string;
  score: number;
  verdict: 'Promising' | 'Needs Work' | 'Not Viable';
  risks: string[];
  suggestions: string[];
  marketSize: 'small' | 'medium' | 'large';
  competitionLevel: 'low' | 'medium' | 'high';
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
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

const RISK_PATTERNS: Record<string, string[]> = {
  competition: ['market', 'saas', 'app', 'platform', 'tool'],
  distribution: ['b2c', 'consumer', 'social', 'marketplace'],
  regulation: ['finance', 'health', 'legal', 'medical', 'insurance'],
  technology: ['ai', 'blockchain', 'ml', 'hardware', 'iot'],
};

const SUGGESTIONS: string[] = [
  'Niche down to a specific target audience',
  'Add an AI-powered core feature',
  'Build a freemium tier to drive adoption',
  'Focus on a single killer feature first',
  'Partner with complementary platforms',
  'Establish thought leadership content early',
];

export class IdeaValidator {
  validateIdea(idea: string): IdeaValidationResult {
    const lower = idea.toLowerCase();
    const score = this.computeScore(lower);
    const risks = this.assessRisks(lower);
    const suggestions = this.generateSuggestions(score);

    let verdict: IdeaValidationResult['verdict'];
    if (score >= 70) verdict = 'Promising';
    else if (score >= 40) verdict = 'Needs Work';
    else verdict = 'Not Viable';

    const competitionLevel = lower.length > 50 ? 'high' : lower.length > 25 ? 'medium' : 'low';
    const marketSize = score >= 70 ? 'large' : score >= 40 ? 'medium' : 'small';

    return {
      idea,
      score,
      verdict,
      risks: risks.map(r => r.type),
      suggestions,
      marketSize,
      competitionLevel,
      timestamp: new Date().toISOString(),
    };
  }

  analyzeMarket(idea: string): MarketAnalysis {
    const lower = idea.toLowerCase();
    const segments = ['Early adopters', 'SMBs', 'Enterprise'];
    const targetAudience = lower.includes('developer') || lower.includes('engineer')
      ? 'Software developers and technical teams'
      : lower.includes('business') || lower.includes('saas')
      ? 'Business owners and startups'
      : 'General consumers and professionals';

    return {
      segments,
      targetAudience,
      estimatedMarketSize: '$1B - $10B TAM',
      growthRate: '15-25% YoY',
    };
  }

  assessRisks(idea: string): Risk[] {
    const lower = idea.toLowerCase();
    const risks: Risk[] = [];

    for (const [riskType, keywords] of Object.entries(RISK_PATTERNS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        risks.push({
          type: riskType,
          severity: riskType === 'regulation' ? 'high' : 'medium',
          mitigation: `Develop a strategy to address ${riskType} challenges early`,
        });
      }
    }

    if (risks.length === 0) {
      risks.push({
        type: 'market-fit',
        severity: 'medium',
        mitigation: 'Validate with at least 10 paying customers before scaling',
      });
    }

    return risks;
  }

  private computeScore(idea: string): number {
    let score = 50;
    if (idea.length > 10) score += 10;
    if (idea.includes('ai') || idea.includes('automation')) score += 15;
    if (idea.includes('saas') || idea.includes('platform')) score += 10;
    if (idea.includes('marketplace') || idea.includes('api')) score += 5;
    if (idea.length > 100) score -= 10;
    return Math.min(100, Math.max(0, score));
  }

  private generateSuggestions(score: number): string[] {
    const count = score >= 70 ? 2 : score >= 40 ? 3 : 4;
    return SUGGESTIONS.slice(0, count);
  }
}

export const ideaValidator = new IdeaValidator();
