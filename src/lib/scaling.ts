/**
 * Scaling System for AI App Builder
 * Simulated auto-scaling for server instances based on user demand and performance metrics
 */

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeRequests: number;
  responseTimeMs: number;
  instanceCount: number;
}

export class ScalingSimulation {
  private metrics: ScalingMetrics = {
    cpuUsage: 25,
    memoryUsage: 30,
    activeRequests: 10,
    responseTimeMs: 250,
    instanceCount: 1,
  };

  constructor() {}

  /**
   * Simulates a check for auto-scaling
   * @param currentMetrics Current performance metrics
   * @returns boolean indicating if the system should scale up or down
   */
  public checkScaling(currentMetrics: ScalingMetrics): { scaleUp: boolean; scaleDown: boolean; reason?: string } {
    const { cpuUsage, memoryUsage, activeRequests, instanceCount } = currentMetrics;

    // Thresholds for scaling up
    if (cpuUsage > 80 || memoryUsage > 85 || activeRequests > 100) {
      return { scaleUp: true, scaleDown: false, reason: 'High CPU/Memory/Request load' };
    }

    // Thresholds for scaling down
    if (cpuUsage < 20 && memoryUsage < 30 && activeRequests < 10 && instanceCount > 1) {
      return { scaleUp: false, scaleDown: true, reason: 'Low CPU/Memory/Request load' };
    }

    return { scaleUp: false, scaleDown: false };
  }

  /**
   * Simulates the scaling of the system
   * @param direction 'up' to scale up, 'down' to scale down
   * @returns Updated ScalingMetrics
   */
  public scale(direction: 'up' | 'down'): ScalingMetrics {
    if (direction === 'up') {
      this.metrics.instanceCount++;
      // Simulate performance improvement after scaling up
      this.metrics.cpuUsage /= 1.5;
      this.metrics.memoryUsage /= 1.5;
      this.metrics.responseTimeMs *= 0.8;
    } else if (direction === 'down' && this.metrics.instanceCount > 1) {
      this.metrics.instanceCount--;
      // Simulate performance decrease after scaling down
      this.metrics.cpuUsage *= 1.5;
      this.metrics.memoryUsage *= 1.5;
      this.metrics.responseTimeMs /= 0.8;
    }

    return { ...this.metrics };
  }

  /**
   * Retrieves current performance metrics
   * @returns Current ScalingMetrics
   */
  public getMetrics(): ScalingMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets the simulation to default metrics
   */
  public reset(): void {
    this.metrics = {
      cpuUsage: 25,
      memoryUsage: 30,
      activeRequests: 10,
      responseTimeMs: 250,
      instanceCount: 1,
    };
  }

  /**
   * Updates the metrics with simulated values
   * @param updates Metrics to update
   */
  public updateMetrics(updates: Partial<ScalingMetrics>): void {
    this.metrics = { ...this.metrics, ...updates };
  }
}

export const scalingSimulation = new ScalingSimulation();
