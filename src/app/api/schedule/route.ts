import { NextRequest, NextResponse } from "next/server";
import { aiScheduler } from "@/lib/ai-scheduler";
import { z } from "zod";

export const runtime = "nodejs";

const scheduleTaskSchema = z.object({
  type: z.enum(["build", "deploy", "monitor", "analyze", "optimize"]),
  resourceId: z.string(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dependencies: z.array(z.string()).optional(),
});

const executeScheduleSchema = z.object({
  scheduleId: z.string(),
});

/**
 * POST /api/schedule
 * Schedule a new task or execute a schedule
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "schedule-task": {
        const parsed = scheduleTaskSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        const { type, resourceId, priority = "medium", dependencies = [] } = parsed.data;
        let task;

        switch (type) {
          case "build":
            task = aiScheduler.scheduleBuild(resourceId, priority, dependencies);
            break;
          case "deploy":
            task = aiScheduler.scheduleDeploy(resourceId, priority, dependencies);
            break;
          case "monitor":
            task = aiScheduler.scheduleMonitoring(resourceId);
            break;
          case "analyze":
            task = aiScheduler.scheduleAnalysis(resourceId, priority);
            break;
          case "optimize":
            task = aiScheduler.scheduleOptimization(resourceId, priority);
            break;
        }

        return NextResponse.json({ success: true, data: task });
      }

      case "execute-schedule": {
        const parsed = executeScheduleSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        const schedule = await aiScheduler.executeSchedule(parsed.data.scheduleId);
        return NextResponse.json({ success: true, data: schedule });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json(
      { error: "Scheduling failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/schedule?scheduleId=xxx
 * Get schedule, task queue, or all schedules
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    const taskQueue = searchParams.get("taskQueue") === "true";
    const allSchedules = searchParams.get("allSchedules") === "true";
    const pending = searchParams.get("pending") === "true";
    const running = searchParams.get("running") === "true";

    if (scheduleId) {
      const schedule = aiScheduler.getSchedule(scheduleId);
      if (!schedule) {
        return NextResponse.json(
          { error: "Schedule not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: schedule });
    }

    if (taskQueue) {
      return NextResponse.json({ success: true, data: aiScheduler.getTaskQueue() });
    }

    if (allSchedules) {
      return NextResponse.json({ success: true, data: aiScheduler.getAllSchedules() });
    }

    if (pending) {
      return NextResponse.json({ success: true, data: aiScheduler.getPendingTasks() });
    }

    if (running) {
      return NextResponse.json({ success: true, data: aiScheduler.getRunningTasks() });
    }

    return NextResponse.json(
      { error: "Specify a query parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Schedule GET error:", error);
    return NextResponse.json(
      { error: "Failed to get schedule info" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedule?taskId=xxx
 * Cancel a scheduled task
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId query parameter is required" },
        { status: 400 }
      );
    }

    const cancelled = aiScheduler.cancelTask(taskId);

    if (!cancelled) {
      return NextResponse.json(
        { error: "Task not found or cannot be cancelled" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Task cancelled" });
  } catch (error) {
    console.error("Cancel task error:", error);
    return NextResponse.json(
      { error: "Failed to cancel task" },
      { status: 500 }
    );
  }
}
