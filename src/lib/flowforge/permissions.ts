import type { PermissionLevel, OrgMember } from "./types";

/**
 * FlowForge Permission System — Phase 8 (Multi-Tenancy) + Phase 12 (Governance)
 * Role-based access control for Elite multi-tenant organizations.
 */

const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiredLevel: PermissionLevel;
  actualLevel: PermissionLevel;
}

export function hasPermission(
  member: OrgMember,
  requiredLevel: PermissionLevel,
): PermissionCheck {
  const actual = PERMISSION_HIERARCHY[member.permission] ?? 0;
  const required = PERMISSION_HIERARCHY[requiredLevel] ?? 0;
  const allowed = actual >= required;

  return {
    allowed,
    reason: allowed
      ? undefined
      : `Requires ${requiredLevel} permission, but user has ${member.permission}`,
    requiredLevel,
    actualLevel: member.permission,
  };
}

export function canCreateWorkflow(member: OrgMember): boolean {
  return hasPermission(member, "editor").allowed;
}

export function canDeleteWorkflow(member: OrgMember): boolean {
  return hasPermission(member, "admin").allowed;
}

export function canManageMembers(member: OrgMember): boolean {
  return hasPermission(member, "admin").allowed;
}

export function canChangeBilling(member: OrgMember): boolean {
  return hasPermission(member, "owner").allowed;
}

export function canPublishWorkflow(member: OrgMember): boolean {
  return hasPermission(member, "editor").allowed;
}

export function canViewAuditLogs(member: OrgMember): boolean {
  return hasPermission(member, "admin").allowed;
}

export function canVoteGovernance(member: OrgMember): boolean {
  return hasPermission(member, "editor").allowed;
}

export function canExecuteWorkflow(member: OrgMember): boolean {
  return hasPermission(member, "viewer").allowed;
}

export function getPermissionLabel(level: PermissionLevel): string {
  switch (level) {
    case "viewer":
      return "Viewer — Can view and execute workflows";
    case "editor":
      return "Editor — Can create, edit, and publish workflows";
    case "admin":
      return "Admin — Full management including members and audit logs";
    case "owner":
      return "Owner — Complete control including billing and deletion";
  }
}
