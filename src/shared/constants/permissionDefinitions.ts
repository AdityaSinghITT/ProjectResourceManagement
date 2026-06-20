import { PermissionAction, PermissionResource } from '@prisma/client';

export interface PermissionDefinition {
  resource: PermissionResource;
  action: PermissionAction;
  description: string;
}

export function permissionKey(resource: PermissionResource, action: PermissionAction): string {
  return `${resource}:${action}`;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { resource: 'AUTH', action: 'LOGIN', description: 'Authenticate with username and password' },
  { resource: 'AUTH', action: 'CHANGE_PASSWORD', description: 'Change own password' },
  { resource: 'USERS', action: 'CREATE', description: 'Create user accounts' },
  { resource: 'USERS', action: 'LIST', description: 'List user accounts' },
  { resource: 'USERS', action: 'UPDATE', description: 'Update user accounts' },
  { resource: 'USERS', action: 'DELETE', description: 'Deactivate user accounts' },
  { resource: 'RESOURCES', action: 'LIST', description: 'List resource profiles' },
  { resource: 'RESOURCES', action: 'UPDATE', description: 'Update resource profiles' },
  { resource: 'RESOURCES', action: 'CREATE', description: 'Assign manager to resources' },
  { resource: 'PROJECTS', action: 'CREATE', description: 'Create and manage projects' },
  { resource: 'PROJECTS', action: 'LIST', description: 'List projects' },
  { resource: 'PROJECTS', action: 'READ', description: 'View project details' },
  { resource: 'ALLOCATIONS', action: 'CREATE', description: 'Create allocations' },
  { resource: 'ALLOCATIONS', action: 'LIST', description: 'List allocations' },
  { resource: 'ALLOCATIONS', action: 'READ', description: 'View own allocations' },
  { resource: 'ALLOCATIONS', action: 'UPDATE', description: 'End or update allocations' },
  { resource: 'DASHBOARD', action: 'READ', description: 'View manager resource dashboard' },
  { resource: 'TIMESHEETS', action: 'SUBMIT', description: 'Submit own timesheets' },
  { resource: 'TIMESHEETS', action: 'READ', description: 'View own timesheets' },
  { resource: 'TIMESHEETS', action: 'VIEW_TEAM', description: 'View team timesheets' },
  { resource: 'SYSTEM_CONFIG', action: 'READ', description: 'Read system configuration' },
  { resource: 'SYSTEM_CONFIG', action: 'UPDATE', description: 'Update system configuration' },
  { resource: 'ACTIVITY_TAGS', action: 'LIST', description: 'List activity tags' },
];

/** BRD §3.1 — master data + allocation matrix; no allocate or timesheets */
export const ADMIN_PERMISSIONS = [
  'AUTH:LOGIN',
  'AUTH:CHANGE_PASSWORD',
  'USERS:CREATE',
  'USERS:LIST',
  'USERS:UPDATE',
  'USERS:DELETE',
  'RESOURCES:LIST',
  'RESOURCES:UPDATE',
  'RESOURCES:CREATE',
  'PROJECTS:CREATE',
  'PROJECTS:LIST',
  'PROJECTS:READ',
  'ALLOCATIONS:LIST',
  'SYSTEM_CONFIG:READ',
  'SYSTEM_CONFIG:UPDATE',
  'ACTIVITY_TAGS:LIST',
] as const;

/** BRD §3.2 — delivery operations; no employee profile edits or system config */
export const MANAGER_PERMISSIONS = [
  'AUTH:LOGIN',
  'AUTH:CHANGE_PASSWORD',
  'PROJECTS:LIST',
  'PROJECTS:READ',
  'ALLOCATIONS:CREATE',
  'ALLOCATIONS:LIST',
  'ALLOCATIONS:UPDATE',
  'DASHBOARD:READ',
  'TIMESHEETS:VIEW_TEAM',
  'ACTIVITY_TAGS:LIST',
] as const;

/** BRD §3.3 — own timesheets and allocations only */
export const RESOURCE_PERMISSIONS = [
  'AUTH:LOGIN',
  'AUTH:CHANGE_PASSWORD',
  'TIMESHEETS:SUBMIT',
  'TIMESHEETS:READ',
  'ALLOCATIONS:READ',
  'ACTIVITY_TAGS:LIST',
] as const;

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  ADMIN: [...ADMIN_PERMISSIONS],
  MANAGER: [...MANAGER_PERMISSIONS],
  RESOURCE: [...RESOURCE_PERMISSIONS],
};
