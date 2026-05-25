import { assertExpansionDependencies } from './governance.js'
import { createPhaseRuntime } from './trace.js'

export function prepareExpansionPhase(jobId: string, completedPhases: number[], phaseIndex: number) {
  assertExpansionDependencies(completedPhases, phaseIndex)
  return createPhaseRuntime(jobId, phaseIndex)
}
