/**
 * Revenue Optimizer Module for Phase 7 - Revenue Optimization
 * AI-powered pricing optimization, revenue projections, and churn prediction
 */

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  billing: "monthly" | "yearly";
  features: string[];
  target: "solo" | "team" | "enterprise";
}

export interface RevenueProjection {
  period: string;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  growth: number; // Percentage growth
  confidence: number; // Confidence score 0-1
  factors: string[];
}

export interface ChurnPrediction {
  riskLevel: "low" | "medium" | "high";
  probability: number;
  riskFactors: string[];
  recommendations: string[];
  predictedChurnRate: number;
}

export interface OptimizationSuggestion {
  type: "pricing" | "upsell" | "retention" | "acquisition";
  impact: "low" | "medium" | "high";
  description: string;
  expectedIncrease: number; // Percentage or dollar amount
  effort: "low" | "medium" | "high";
}

class RevenueOptimizer {
  private pricingHistory: Array<{ date: string; tiers: PricingTier[] }> = [];
  private revenueHistory: Array<{ date: string; revenue: number }> = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  optimizePricing(currentPricing: PricingTier[], _currentMRR?: number): PricingTier[] {
    const optimized = currentPricing.map((tier) => {
      let newPrice = tier.price;
      this.getOptimalPriceFactor(tier);

      if (tier.target === "solo") {
        newPrice = Math.round(tier.price * 1.1 * 10) / 10;
      } else if (tier.target === "team") {
        newPrice = Math.round(tier.price * 1.15 * 10) / 10;
      } else if (tier.target === "enterprise") {
        newPrice = Math.round(tier.price * 1.2);
      }

      return {
        ...tier,
        price: Math.max(tier.price * 0.9, Math.min(tier.price * 1.3, newPrice)),
      };
    });

    this.pricingHistory.push({
      date: new Date().toISOString(),
      tiers: optimized,
    });

    return optimized;
  }

  projectRevenue(
    currentMRR: number,
    growthRate: number,
    months: number = 12
  ): RevenueProjection[] {
    const projections: RevenueProjection[] = [];
    let mrr = currentMRR;

    for (let i = 1; i <= months; i++) {
      const monthlyGrowth = growthRate / 12;  // Deterministic: no random noise
      mrr = mrr * (1 + monthlyGrowth);
      const arr = mrr * 12;
      const growth = ((mrr - currentMRR) / currentMRR) * 100;

      const factors = [
        "Market growth trends",
        "Competitive positioning",
        "Customer acquisition pipeline",
        "Retention rates",
      ];

      if (i > 6) factors.push("Seasonal patterns");
      if (i > 9) factors.push("Product feature releases");

      projections.push({
        period: `Month ${i}`,
        mrr: Math.round(mrr),
        arr: Math.round(arr),
        growth: Math.round(growth * 10) / 10,
        confidence: Math.max(0.5, 1 - i * 0.04),
        factors: factors.slice(0, 4),
      });
    }

    return projections;
  }

  predictChurn(userMetrics: {
    loginFrequency: number;
    featureUsage: number;
    supportTickets: number;
    accountAge: number;
    paymentHistory: "good" | "fair" | "poor";
  }): ChurnPrediction {
    let riskScore = 0;
    const riskFactors: string[] = [];

    if (userMetrics.loginFrequency < 2) {
      riskScore += 30;
      riskFactors.push("Low login frequency");
    }

    if (userMetrics.featureUsage < 20) {
      riskScore += 25;
      riskFactors.push("Low feature engagement");
    }

    if (userMetrics.supportTickets > 5) {
      riskScore += 20;
      riskFactors.push("High support ticket volume");
    }

    if (userMetrics.paymentHistory === "poor") {
      riskScore += 35;
      riskFactors.push("Payment history issues");
    } else if (userMetrics.paymentHistory === "fair") {
      riskScore += 15;
    }

    if (userMetrics.accountAge > 24 && userMetrics.featureUsage > 80) {
      riskScore -= 15; // Loyal customer
    }

    const riskLevel: ChurnPrediction["riskLevel"] =
      riskScore > 50 ? "high" : riskScore > 25 ? "medium" : "low";

    const recommendations: string[] = [];
    if (riskFactors.includes("Low login frequency")) {
      recommendations.push("Implement re-engagement email campaign");
    }
    if (riskFactors.includes("Low feature engagement")) {
      recommendations.push("Schedule onboarding review session");
    }
    if (riskFactors.includes("High support ticket volume")) {
      recommendations.push("Provide priority support and dedicated account manager");
    }
    if (riskFactors.includes("Payment history issues")) {
      recommendations.push("Offer flexible payment options and payment plans");
    }

    if (riskLevel === "low") {
      recommendations.push("Focus on upselling and expansion opportunities");
    }

    return {
      riskLevel,
      probability: Math.min(100, Math.max(0, riskScore)),
      riskFactors,
      recommendations,
      predictedChurnRate: riskScore / 100,
    };
  }

  generateOptimizationSuggestions(
    currentMetrics: {
      mrr: number;
      arpu: number; // Average Revenue Per User
      churnRate: number;
      conversionRate: number;
    }
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Pricing optimization
    if (currentMetrics.arpu < 50) {
      suggestions.push({
        type: "pricing",
        impact: "high",
        description: "Introduce premium tier with advanced features",
        expectedIncrease: 20,
        effort: "medium",
      });
    }

    // Upsell opportunities
    if (currentMetrics.churnRate < 5 && currentMetrics.arpu > 30) {
      suggestions.push({
        type: "upsell",
        impact: "medium",
        description: "Create annual billing plan with 20% discount",
        expectedIncrease: 15,
        effort: "low",
      });
    }

    // Retention improvements
    if (currentMetrics.churnRate > 5) {
      suggestions.push({
        type: "retention",
        impact: "high",
        description: "Implement loyalty rewards program",
        expectedIncrease: -currentMetrics.churnRate * 0.3,
        effort: "medium",
      });
    }

    // Acquisition optimization
    if (currentMetrics.conversionRate < 5) {
      suggestions.push({
        type: "acquisition",
        impact: "medium",
        description: "Optimize free trial onboarding flow",
        expectedIncrease: 50, // Percentage increase in conversion
        effort: "high",
      });
    }

    if (currentMetrics.mrr > 10000) {
      suggestions.push({
        type: "upsell",
        impact: "high",
        description: "Launch enterprise tier with dedicated support",
        expectedIncrease: 25,
        effort: "medium",
      });
    }

    return suggestions.sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  private getOptimalPriceFactor(tier: PricingTier): number {
    // AI-driven price optimization would use market data
    // This is a simplified version
    const baseFactors = {
      solo: 1.1,
      team: 1.15,
      enterprise: 1.2,
    };
    return baseFactors[tier.target];
  }

  recordRevenue(date: string, revenue: number) {
    this.revenueHistory.push({ date, revenue });
  }

  getRevenueHistory() {
    return this.revenueHistory;
  }

  getPricingHistory() {
    return this.pricingHistory;
  }
}

export const revenueOptimizer = new RevenueOptimizer();
