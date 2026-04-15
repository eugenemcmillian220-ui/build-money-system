export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { fullStackGenerator } from "@/lib/fullstack-generator";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const fullStackConfigSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000, "Prompt too long"),
  features: z.array(z.string()).default([]),
  database: z.enum(["postgresql", "mongodb", "sqlite", "none"]).default("none"),
  authentication: z.boolean().default(false),
  testing: z.boolean().default(false),
  ci_cd: z.boolean().default(false),
  docker: z.boolean().default(false),
});

/**
 * POST /api/fullstack
 * Generate a complete full-stack application with all production features
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = fullStackConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const config = parsed.data;

    // Generate full-stack application
    const result = await fullStackGenerator.generate(config);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Full-stack generation error:", error);
    return NextResponse.json(
      {
        error: "Full-stack generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fullstack
 * Get information about available full-stack features
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({
    success: true,
    data: {
      availableDatabases: ["postgresql", "mongodb", "sqlite"],
      availableFeatures: [
        "User authentication",
        "Database integration",
        "API routes",
        "Testing suite (Jest)",
        "CI/CD pipeline (GitHub Actions)",
        "Docker containerization",
        "Environment configuration",
        "Error handling",
        "Input validation (Zod)",
        "TypeScript types",
        "Responsive design (Tailwind CSS)",
        "SEO optimization",
        "Performance optimizations",
      ],
      exampleConfig: {
        prompt: "Build a task management app with user authentication",
        features: ["User accounts", "Task CRUD", "Due dates", "Categories"],
        database: "postgresql",
        authentication: true,
        testing: true,
        ci_cd: true,
        docker: true,
      },
    },
  });
}
