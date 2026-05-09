import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 9;
export const preferredRegion = "iad1";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CRON_SECRET;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (token !== expectedSecret) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Queue job instead of running synchronously
    // This prevents timeout on Vercel Hobby
    const jobId = await queueSelfImproveJob();

    return NextResponse.json({ success: true, jobId }, { status: 200 });
  } catch (error) {
    console.error("Self-improve cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function queueSelfImproveJob() {
  // TODO: Implement job queuing (Redis, database, or external queue service)
  // For now, return a mock job ID
  return `job_${Date.now()}`;
}
