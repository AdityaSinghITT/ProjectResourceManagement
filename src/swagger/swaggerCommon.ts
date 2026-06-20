/** Shared OpenAPI enums and RBAC notes (aligned with Prisma schema + permissionDefinitions.ts). */

export const SWAGGER_ROLES = ['ADMIN', 'MANAGER', 'RESOURCE'] as const;

export const SWAGGER_DEPARTMENTS = [
  'ENGINEERING',
  'QUALITY_ASSURANCE',
  'DEVOPS',
  'PRODUCT',
  'HUMAN_RESOURCES',
] as const;

export const SWAGGER_DESIGNATIONS = [
  'SOFTWARE_ENGINEER',
  'SENIOR_SOFTWARE_ENGINEER',
  'TEAM_LEAD',
  'PROJECT_MANAGER',
  'QA_ENGINEER',
  'DEVOPS_ENGINEER',
  'BUSINESS_ANALYST',
] as const;

export const RESOURCE_PROFILE_ID_DESCRIPTION =
  'Resource profile ID (from GET /api/admin/employees or manager dashboard/timesheets). ' +
  'Legacy API paths use `employeeId` in places — value is always the resource profile ID, not user ID.';

export const USER_ID_DESCRIPTION = 'User ID from GET /api/admin/users (login account id).';

export function rbacDescription(permission: string, role: string): string {
  return (
    `**RBAC:** requires JWT permission \`${permission}\` and role \`${role}\` ` +
    '(see login response `user.permissions`).'
  );
}

export const forbiddenRbacResponse = {
  '403': {
    description: 'Forbidden — wrong role or missing permission',
  },
};
