// DA-069 TODO: Add integration tests with mock task queue
/**
 * AI Scheduler Module for Phase 7 - Automated Task Scheduling
 * Intelligent scheduling of autonomous tasks, builds, and maintenance
 */

export interface ScheduledTask {
  id: string;
  name: string;
  type: "build" | "deploy" | "monitor" | "analyze" | "optimize";
  scheduledAt: string;
  status: "pending" | "running" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "critical";
  estimatedDuration: number; // in minutes
  dependencies: string[];
  result?: unknown;
  error?: string;
}

export interface Schedule {
  id: string;
  name: string;
  tasks: ScheduledTask[];
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
}

class AIScheduler {
  private schedules: Map<string, Schedule> = new Map();
  private taskQueue: ScheduledTask[] = [];

  scheduleBuild(
    projectId: string,
    priority: "low" | "medium" | "high" = "medium",
    dependencies: string[] = []
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: `Build project ${projectId}`,
      type: "build",
      scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      status: "pending",
      priority,
      estimatedDuration: 10,
      dependencies,
    };

    this.taskQueue.push(task);
    return task;
  }

  scheduleDeploy(
    deploymentId: string,
    priority: "low" | "medium" | "high" = "high",
    dependencies: string[] = []
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: `Deploy ${deploymentId}`,
      type: "deploy",
      scheduledAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
      status: "pending",
      priority,
      estimatedDuration: 5,
      dependencies,
    };

    this.taskQueue.push(task);
    return task;
  }

  scheduleMonitoring(
    resourceId: string,
    interval: number = 30 // minutes
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: `Monitor ${resourceId}`,
      type: "monitor",
      scheduledAt: new Date(Date.now() + interval * 60 * 1000).toISOString(),
      status: "pending",
      priority: "medium",
      estimatedDuration: 2,
      dependencies: [],
    };

    this.taskQueue.push(task);
    return task;
  }

  scheduleAnalysis(
    projectId: string,
    priority: "low" | "medium" | "high" = "medium"
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: `Analyze ${projectId}`,
      type: "analyze",
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
      status: "pending",
      priority,
      estimatedDuration: 15,
      dependencies: [],
    };

    this.taskQueue.push(task);
    return task;
  }

  scheduleOptimization(
    resourceId: string,
    priority: "low" | "medium" | "high" = "medium"
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: `Optimize ${resourceId}`,
      type: "optimize",
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      status: "pending",
      priority,
      estimatedDuration: 20,
      dependencies: [],
    };

    this.taskQueue.push(task);
    return task;
  }

  createSchedule(
    name: string,
    tasks: Omit<ScheduledTask, "id">[]
  ): Schedule {
    const schedule: Schedule = {
      id: `schedule-${Date.now()}`,
      name,
      tasks: tasks.map((task) => ({
        ...task,
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      })),
      status: "pending",
    };

    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async executeSchedule(scheduleId: string): Promise<Schedule> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    schedule.status = "running";
    schedule.startedAt = new Date().toISOString();
    this.schedules.set(scheduleId, schedule);

    // Sort tasks by priority and dependencies
    const sortedTasks = this.sortTasksByPriority(schedule.tasks);

    for (const task of sortedTasks) {
      if (task.status === "completed") continue;

      // Check dependencies
      const dependenciesMet = task.dependencies.every((depId) => {
        const depTask = schedule.tasks.find((t) => t.id === depId);
        return depTask?.status === "completed";
      });

      if (!dependenciesMet) {
        task.status = "failed";
        task.error = "Dependencies not met";
        continue;
      }

      task.status = "running";
      this.schedules.set(scheduleId, schedule);

      // Simulate task execution
      await this.executeTask(task);

      task.status = "completed";
      this.schedules.set(scheduleId, schedule);
    }

    const hasFailedTasks = schedule.tasks.some((t) => t.status === "failed");
    schedule.status = hasFailedTasks ? "failed" : "completed";
    schedule.completedAt = new Date().toISOString();
    this.schedules.set(scheduleId, schedule);

    return schedule;
  }

  private sortTasksByPriority(tasks: ScheduledTask[]): ScheduledTask[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return [...tasks].sort((a, b) => {
      // First sort by priority
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // Then by dependencies (tasks with fewer dependencies first)
      if (a.dependencies.length !== b.dependencies.length) {
        return a.dependencies.length - b.dependencies.length;
      }

      // Finally by scheduled time
      return (
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
    });
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    // Simulate task execution time
    await new Promise((resolve) =>
      setTimeout(resolve, task.estimatedDuration * 100)
    );

    // Simulate task result based on type
    switch (task.type) {
      case "build":
        task.result = { buildId: `build-${Date.now()}`, status: "success" };
        break;
      case "deploy":
        task.result = { deploymentId: `deploy-${Date.now()}`, url: "https://example.com" };
        break;
      case "monitor":
        task.result = { health: "healthy", metrics: { uptime: 99.9 } };
        break;
      case "analyze":
        task.result = { insights: ["Performance optimized", "Security improved"] };
        break;
      case "optimize":
        task.result = { improvements: ["Cost reduced by 15%", "Speed improved by 20%"] };
        break;
    }
  }

  getTaskQueue(): ScheduledTask[] {
    return this.taskQueue;
  }

  getSchedule(scheduleId: string): Schedule | null {
    return this.schedules.get(scheduleId) || null;
  }

  getAllSchedules(): Schedule[] {
    return Array.from(this.schedules.values());
  }

  getPendingTasks(): ScheduledTask[] {
    return this.taskQueue.filter((task) => task.status === "pending");
  }

  getRunningTasks(): ScheduledTask[] {
    return this.taskQueue.filter((task) => task.status === "running");
  }

  cancelTask(taskId: string): boolean {
    const index = this.taskQueue.findIndex((t) => t.id === taskId);
    if (index === -1) return false;

    const task = this.taskQueue[index];
    if (task.status === "running") return false;

    this.taskQueue.splice(index, 1);
    return true;
  }
}

export const aiScheduler = new AIScheduler();
