import { PermissionAction, PermissionResource } from '@prisma/client';
import { prisma } from '../client';
import { IAuthorizationRepository } from '../../../domain/interfaces/IAuthorizationRepository';
import {
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_MAP,
  permissionKey,
} from '../../../shared/constants/permissionDefinitions';
import { RoleName } from '../../../shared/constants/roleNames';

export class PrismaAuthorizationRepository implements IAuthorizationRepository {
  async ensureRolesAndPermissions(): Promise<void> {
    for (const roleName of Object.keys(ROLE_PERMISSION_MAP)) {
      await prisma.role.upsert({
        where: { roleName },
        update: {},
        create: { roleName },
      });
    }

    for (const definition of PERMISSION_DEFINITIONS) {
      await prisma.permission.upsert({
        where: {
          resource_action: {
            resource: definition.resource,
            action: definition.action,
          },
        },
        update: { description: definition.description },
        create: {
          resource: definition.resource,
          action: definition.action,
          description: definition.description,
        },
      });
    }

    const roles = await prisma.role.findMany();
    const permissions = await prisma.permission.findMany();
    const permissionByKey = new Map(
      permissions.map((permission) => [
        permissionKey(permission.resource, permission.action),
        permission.id,
      ]),
    );

    for (const role of roles) {
      const keys = ROLE_PERMISSION_MAP[role.roleName];
      if (!keys) {
        continue;
      }

      const allowedPermissionIds: number[] = [];
      for (const key of keys) {
        const permissionId = permissionByKey.get(key);
        if (!permissionId) {
          continue;
        }

        allowedPermissionIds.push(permissionId);

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }

      await prisma.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: { notIn: allowedPermissionIds },
        },
      });
    }
  }

  async findRoleIdByName(roleName: RoleName): Promise<number | null> {
    const role = await prisma.role.findUnique({ where: { roleName } });
    return role?.id ?? null;
  }

  async assignPrimaryRole(
    userId: number,
    roleName: RoleName,
    assignedByUserId?: number,
  ): Promise<void> {
    const roleId = await this.findRoleIdByName(roleName);
    if (!roleId) {
      throw new Error(`Role not found: ${roleName}`);
    }

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
      update: {
        isPrimary: true,
      },
      create: {
        userId,
        roleId,
        isPrimary: true,
        assignedByUserId,
      },
    });
  }

  async getPrimaryRoleName(userId: number): Promise<RoleName | null> {
    const userRole = await prisma.userRole.findFirst({
      where: { userId, isPrimary: true },
      include: { role: true },
    });

    return (userRole?.role.roleName as RoleName | undefined) ?? null;
  }

  async getPermissionKeysForUser(userId: number): Promise<string[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const keys = new Set<string>();
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        keys.add(
          permissionKey(rolePermission.permission.resource, rolePermission.permission.action),
        );
      }
    }

    return [...keys];
  }

  async userHasPermission(
    userId: number,
    resource: PermissionResource,
    action: PermissionAction,
  ): Promise<boolean> {
    const keys = await this.getPermissionKeysForUser(userId);
    return keys.includes(permissionKey(resource, action));
  }
}
