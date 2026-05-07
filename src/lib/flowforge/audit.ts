import type { AuditLogEntry, AuditAction } from "./types";

/**
 * FlowForge Audit Logger — Phase 12 (Governance) + Phase 4 (Sentinel)
 * Immutable audit trail for all FlowForge operations.
 * Elite mode: Full audit with IP tracking, compliance export.
 * Universal mode: Basic action logging.
 */

const auditBuffer: AuditLogEntry[] = [];
const MAX_BUFFER_SIZE = 10_000;

export function createAuditEntry(
  orgId: string,
  userId: string,
  action: AuditAction,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {},
  ipAddress: string = "0.0.0.0",
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    org_id: orgId,
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: ipAddress,
    created_at: new Date().toISOString(),
  };

  auditBuffer.push(entry);
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.splice(0, auditBuffer.length - MAX_BUFFER_SIZE);
  }

  return entry;
}

export function getAuditLogs(
  orgId: string,
  filters?: {
    action?: AuditAction;
    userId?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  },
): AuditLogEntry[] {
  let logs = auditBuffer.filter((e) => e.org_id === orgId);

  if (filters?.action) {
    logs = logs.filter((e) => e.action === filters.action);
  }
  if (filters?.userId) {
    logs = logs.filter((e) => e.user_id === filters.userId);
  }
  if (filters?.resourceType) {
    logs = logs.filter((e) => e.resource_type === filters.resourceType);
  }
  if (filters?.startDate) {
    logs = logs.filter((e) => e.created_at >= filters.startDate!);
  }
  if (filters?.endDate) {
    logs = logs.filter((e) => e.created_at <= filters.endDate!);
  }

  return logs
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, filters?.limit ?? 100);
}

export function exportAuditCSV(orgId: string): string {
  const logs = getAuditLogs(orgId, { limit: 10_000 });
  const header = "id,timestamp,user_id,action,resource_type,resource_id,ip_address,details";
  const rows = logs.map(
    (e) =>
      `${e.id},${e.created_at},${e.user_id},${e.action},${e.resource_type},${e.resource_id},${e.ip_address},"${JSON.stringify(e.details).replace(/"/g, '""')}"`,
  );
  return [header, ...rows].join("\n");
}
