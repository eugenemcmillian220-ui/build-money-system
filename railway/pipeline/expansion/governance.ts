import { getExpansionDescriptor } from './phase-groups.js'

export function assertExpansionDependencies(completedPhases: number[], phaseIndex: number): void {
  const descriptor = getExpansionDescriptor(phaseIndex)
  if (!descriptor) return

  const missing = descriptor.dependencies.filter((dependency) => !completedPhases.includes(dependency))
  if (missing.length > 0) {
    throw new Error(
      `Phase dependency violation for ${descriptor.key}. Missing prerequisites: ${missing.join(',')}`,
    )
  }
}
