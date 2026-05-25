import { getExpansionBand, getExpansionDescriptor } from './phase-groups.js'
import type { ExpansionPhaseRuntime } from './types.js'

export function createPhaseRuntime(jobId: string, phaseIndex: number): ExpansionPhaseRuntime {
  const descriptor =
    getExpansionDescriptor(phaseIndex) ?? {
      index: phaseIndex,
      key: `phase-${String(phaseIndex + 1).padStart(2, '0')}`,
      displayName: `Phase ${phaseIndex + 1}`,
      objective: 'Pipeline execution',
      dependencies: [],
      riskLevel: 'medium' as const,
      band: getExpansionBand(phaseIndex),
    }

  const correlationId = `${jobId}:${descriptor.key}`
  const idempotencyKey = `${correlationId}:v1`

  return { descriptor, correlationId, idempotencyKey }
}
