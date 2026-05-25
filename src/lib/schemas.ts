import { z } from 'zod'

export const pipelineStartSchema = z.object({
  projectId: z.string().uuid(),
  spec: z.record(z.string(), z.unknown()).default({}),
})

export const projectCreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(5_000).optional(),
})

export type PipelineStartInput = z.infer<typeof pipelineStartSchema>
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>
