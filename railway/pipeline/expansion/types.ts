export type ExpansionPhaseBand =
  | 'foundation'
  | 'build'
  | 'economy'
  | 'federation'
  | 'autonomy'

export interface ExpansionPhaseDescriptor {
  index: number
  key: string
  displayName: string
  band: ExpansionPhaseBand
  objective: string
  dependencies: number[]
  riskLevel: 'low' | 'medium' | 'high'
}

export interface ExpansionPhaseRuntime {
  descriptor: ExpansionPhaseDescriptor
  correlationId: string
  idempotencyKey: string
}
