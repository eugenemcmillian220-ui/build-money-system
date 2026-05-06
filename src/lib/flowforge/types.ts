/**
 * FlowForge — AI Workflow Automation Hub
 * Core type definitions for workflows, nodes, triggers, and execution.
 * Exercises all 25 phases: Elite (multi-tenant, governance, audit),
 * Universal (SaaS dashboard, APIs, billing), Nano (mobile-first TMA triggers).
 */

export type WorkflowStatus = "draft" | "active" | "paused" | "archived" | "error";
export type NodeType = "trigger" | "action" | "condition" | "transform" | "ai-agent" | "webhook" | "delay" | "loop";
export type ExecutionStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "timeout";
export type TriggerType = "manual" | "schedule" | "webhook" | "event" | "nano-tap";
export type BillingTier = "free" | "starter" | "pro" | "enterprise" | "admin_free";
export type AuditAction = "workflow.created" | "workflow.updated" | "workflow.deleted" | "workflow.executed" | "workflow.published" | "permission.changed" | "member.invited" | "member.removed" | "billing.upgraded" | "governance.vote";
export type PermissionLevel = "viewer" | "editor" | "admin" | "owner";
export type GovernanceProposalStatus = "active" | "passed" | "rejected" | "executed";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  connections: string[];
}

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  mode: "elite" | "universal" | "nano";
  version: number;
  is_monetized: boolean;
  price_credits: number;
  execution_count: number;
  avg_execution_ms: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  org_id: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  node_results: NodeExecutionResult[];
  credits_used: number;
}

export interface NodeExecutionResult {
  node_id: string;
  status: ExecutionStatus;
  started_at: string;
  completed_at: string | null;
  output: unknown;
  error: string | null;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  user_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  email: string;
  permission: PermissionLevel;
  invited_at: string;
  accepted_at: string | null;
}

export interface GovernanceProposal {
  id: string;
  org_id: string;
  title: string;
  description: string;
  proposed_by: string;
  status: GovernanceProposalStatus;
  votes_for: number;
  votes_against: number;
  quorum_required: number;
  expires_at: string;
  created_at: string;
}

export interface FlowForgeAnalytics {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  success_rate: number;
  avg_execution_time_ms: number;
  credits_consumed: number;
  revenue_generated: number;
  top_workflows: { id: string; name: string; executions: number }[];
}

export interface NanoTrigger {
  id: string;
  workflow_id: string;
  label: string;
  icon: string;
  color: string;
  tap_count: number;
  last_triggered: string | null;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  mode: "elite" | "universal" | "nano";
  nodes: WorkflowNode[];
  trigger_type: TriggerType;
  phases_exercised: number[];
  tags: string[];
}
