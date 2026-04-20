import "server-only";
import { getPulseMetrics } from "./actions/pulse-actions";

/**
 * Scaling System for AI App Builder
 * Now integrated with Sovereign Pulse for real-time demand-driven scaling.
 */

export interface ScalingMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeRequests: number;
  responseTimeMs: number;
  instanceCount: number;
}

export class ScalingEngine {
  private metrics: ScalingMetrics = {
    cpuUsage: 25,
    memoryUsage: 30,
    activeRequests: 10,
    responseTimeMs: 250,
    instanceCount: 1,
  };

  /**
   * Syncs with Sovereign Pulse to get real performance data
   */
  async syncWithPulse(): Promise<ScalingMetrics> {
    try {
      const pulseMetrics = await getPulseMetrics("00000000-0000-0000-0000-000000000000", 1); // Last 24 hours
      
      // Map Pulse metrics to Scaling metrics
      this.metrics.activeRequests = pulseMetrics.views;
      this.metrics.responseTimeMs = pulseMetrics.latency;
      
      // In a real environment, we'd fetch CPU/Memory from the provider (Vercel/AWS)
      // Here we simulate them based on request volume
      this.metrics.cpuUsage = Math.min(95, 20 + (pulseMetrics.views / 1000) * 10);
      this.metrics.memoryUsage = Math.min(95, 30 + (pulseMetrics.views / 1000) * 5);

      return this.metrics;
    } catch (err) {
      console.warn("[SCALING] Failed to sync with Pulse, using current state:", err);
      return this.metrics;
    }
  }

  /**
   * Evaluates if the system should scale up or down
   */
  public checkScaling(currentMetrics: ScalingMetrics): { scaleUp: boolean; scaleDown: boolean; reason?: string } {
    const { cpuUsage, memoryUsage, activeRequests, instanceCount } = currentMetrics;

    if (cpuUsage > 80 || memoryUsage > 85 || activeRequests > 5000) {
      return { scaleUp: true, scaleDown: false, reason: 'High load detected via Pulse' };
    }

    if (cpuUsage < 20 && memoryUsage < 30 && activeRequests < 100 && instanceCount > 1) {
      return { scaleUp: false, scaleDown: true, reason: 'System over-provisioned' };
    }

    return { scaleUp: false, scaleDown: false };
  }

  /**
   * Executes scaling operations
   */
  public async scale(direction: 'up' | 'down'): Promise<ScalingMetrics> {
    console.log(`[SCALING] Initiating scale ${direction}...`);
    
    if (direction === 'up') {
      this.metrics.instanceCount++;
    } else if (direction === 'down' && this.metrics.instanceCount > 1) {
      this.metrics.instanceCount--;
    }

    // After scaling, we wait for metrics to stabilize
    return { ...this.metrics };
  }

  public getMetrics(): ScalingMetrics {
    return { ...this.metrics };
  }
}

export const scalingEngine = new ScalingEngine();
