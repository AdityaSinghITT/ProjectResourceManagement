import { PermissionAction, PermissionResource } from '@prisma/client';
import { RoleName } from '../../shared/constants/roleNames';

export interface IAuthorizationRepository {
  ensureRolesAndPermissions(): Promise<void>;
  findRoleIdByName(roleName: RoleName): Promise<number | null>;
  assignPrimaryRole(userId: number, roleName: RoleName, assignedByUserId?: number): Promise<void>;
  getPrimaryRoleName(userId: number): Promise<RoleName | null>;
  getPermissionKeysForUser(userId: number): Promise<string[]>;
  userHasPermission(
    userId: number,
    resource: PermissionResource,
    action: PermissionAction,
  ): Promise<boolean>;
}
