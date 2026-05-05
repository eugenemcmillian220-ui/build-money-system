// DA-065 FIX: TODO: Split into dedicated sub-routes
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { revenueOptimizer } from "@/lib/revenue-optimizer";
import { z } from "zod";


export const runtime = "nodejs";

const pricingTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  billing: z.enum(["monthly", "yearly"]),
  features: z.array(z.string()),
  target: z.enum(["solo", "team", "enterprise"]),
});

const optimizePricingSchema = z.object({
  currentPricing: z.array(pricingTierSchema),
  currentMRR: z.number().min(0),
});

const projectRevenueSchema = z.object({
  currentMRR: z.number().min(0),
  growthRate: z.number(),
  months: z.number().min(1).max(36).optional(),
});

const predictChurnSchema = z.object({
  loginFrequency: z.number().min(0),
  featureUsage: z.number().min(0).max(100),
  supportTickets: z.number().min(0),
  accountAge: z.number().min(0),
  paymentHistory: z.enum(["good", "fair", "poor"]),
});

const optimizeSuggestionsSchema = z.object({
  mrr: z.number().min(0),
  arpu: z.number().min(0),
  churnRate: z.number().min(0).max(100),
  conversionRate: z.number().min(0).max(100),
});

/**
 * POST /api/revenue-optimize/pricing
 * Optimize pricing tiers based on current MRR
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "optimize-pricing": {
        const parsed = optimizePricingSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        const optimized = revenueOptimizer.optimizePricing(
          parsed.data.currentPricing,
          parsed.data.currentMRR
        );

        return NextResponse.json({ success: true, data: optimized });
      }

      case "project-revenue": {
        const parsed = projectRevenueSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        const projections = revenueOptimizer.projectRevenue(
          parsed.data.currentMRR,
          parsed.data.growthRate,
          parsed.data.months || 12
        );

        return NextResponse.json({ success: true, data: projections });
      }

      case "predict-churn": {
        const parsed = predictChurnSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        const prediction = revenueOptimizer.predictChurn(parsed.data);

        return NextResponse.json({ success: true, data: prediction });
      }

      case "get-suggestions": {
        const parsed = optimizeSuggestionsSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        const suggestions = revenueOptimizer.generateOptimizationSuggestions({
          mrr: parsed.data.mrr,
          arpu: parsed.data.arpu,
          churnRate: parsed.data.churnRate,
          conversionRate: parsed.data.conversionRate,
        });

        return NextResponse.json({ success: true, data: suggestions });
      }

      case "record-revenue": {
        const { date, revenue } = body;
        if (!date || typeof revenue !== "number") {
          return NextResponse.json(
            { error: "date and revenue are required" },
            { status: 400 }
          );
        }

        revenueOptimizer.recordRevenue(date, revenue);
        return NextResponse.json({ success: true, message: "Revenue recorded" });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Revenue optimization error:", error);
    return NextResponse.json(
      { error: "Revenue optimization failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/revenue-optimize
 * Get revenue history and pricing history
 */
export async function GET(): Promise<Response> {
  try {
    return NextResponse.json({
      success: true,
      data: {
        revenueHistory: revenueOptimizer.getRevenueHistory(),
        pricingHistory: revenueOptimizer.getPricingHistory(),
      },
    });
  } catch (error) {
    console.error("Revenue GET error:", error);
    return NextResponse.json(
      { error: "Failed to get revenue data" },
      { status: 500 }
    );
  }
}
