export const RoleNames = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  RESOURCE: 'RESOURCE',
} as const;

export type RoleName = (typeof RoleNames)[keyof typeof RoleNames];

export const ALL_ROLE_NAMES: RoleName[] = [
  RoleNames.ADMIN,
  RoleNames.MANAGER,
  RoleNames.RESOURCE,
];
