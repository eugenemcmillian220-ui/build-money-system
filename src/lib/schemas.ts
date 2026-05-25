// src/lib/schemas.ts
// Zod schema library — all request/response types

import { z } from 'zod';

// ─── Pagination ───────────────────────────────────────────────
export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export type PaginatedResponse<T> = {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
  total?: number;
};

// ─── Pipeline ─────────────────────────────────────────────────
export const CreatePipelineJobSchema = z.object({
  spec: z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    targetUser: z.string().min(1).max(500),
    revenueModel: z.enum(['subscription', 'credits', 'hybrid', 'marketplace']),
    techConstraints: z.array(z.string()).max(10).optional(),
    additionalContext: z.string().max(5000).optional(),
  }),
  projectId: z.string().uuid().optional(),
});
export type CreatePipelineJobRequest = z.infer<typeof CreatePipelineJobSchema>;

// Alias for backward compatibility
export const pipelineStartSchema = CreatePipelineJobSchema;

export const PipelineStatusResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['pending', 'queued', 'running', 'complete', 'failed']),
  currentPhase: z.number().int(),
  currentPhaseName: z.string().nullable(),
  completedPhases: z.array(z.number()),
  totalPhases: z.number().int(),
  progressPercent: z.number(),
  error: z.string().nullable(),
  deliverableUrl: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type PipelineStatusResponse = z.infer<typeof PipelineStatusResponseSchema>;

// ─── Projects ─────────────────────────────────────────────────
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  spec: z.record(z.unknown()).optional(),
});
export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  spec: z.record(z.unknown()).optional(),
  status: z.enum(['draft', 'building', 'complete', 'failed', 'archived']).optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;

// ─── Billing ──────────────────────────────────────────────────
export const BillingCheckoutSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});
export type BillingCheckoutRequest = z.infer<typeof BillingCheckoutSchema>;

export const UserCreditsResponseSchema = z.object({
  balance: z.number().int(),
  lifetimeUsed: z.number().int(),
  planTier: z.string(),
  subscriptionStatus: z.string(),
  currentPeriodEnd: z.string().nullable(),
});
export type UserCreditsResponse = z.infer<typeof UserCreditsResponseSchema>;

// ─── Auth ─────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(200).optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

// ─── Webhooks ─────────────────────────────────────────────────
export const WebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({ object: z.record(z.unknown()) }),
  created: z.number(),
  livemode: z.boolean(),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ─── Error Response ───────────────────────────────────────────
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
