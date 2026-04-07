import { NextRequest, NextResponse } from "next/server";
import { selfImprovementEngine } from "@/lib/self-improve";
import { security } from "@/lib/security";

/**
 * API route for the self-improvement system
 * Handles triggering the self-improvement process and retrieving performance reports
 */

export async function GET(req: NextRequest) {
  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Retrieve performance report
    const report = await selfImprovementEngine.getPerformanceReport();

    return NextResponse.json({
      success: true,
      report,
      message: "Successfully retrieved performance report",
    });
  } catch (error) {
    console.error("Self-Improvement Report Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve performance report" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Run the self-improvement process
    const result = await selfImprovementEngine.runSelfImprovement();

    return NextResponse.json({
      success: true,
      data: result,
      message: "Self-improvement process completed successfully",
    });
  } catch (error) {
    console.error("Self-Improvement Trigger Error:", error);
    return NextResponse.json(
      { error: "Failed to run self-improvement process" },
      { status: 500 }
    );
  }
}
