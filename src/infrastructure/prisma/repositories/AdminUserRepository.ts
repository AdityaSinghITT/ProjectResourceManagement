import { prisma } from '../client';
import {
  CreateUserInput,
  IAdminUserRepository,
} from '../../../domain/interfaces/IAdminUserRepository';
import { AdminUserListResult, CreateUserResult, EmployeeListItem } from '../../../domain/types/admin.types';
import { UserProfile } from '../../../domain/types/user.types';
import { requiresResourceProfile } from '../../../shared/domain/roleRules';
import { ErrorTitles, HttpStatus } from '../../../shared/constants/httpStatusCodes';
import { AppError } from '../../../shared/errors/AppError';
import { mapToUserProfile } from '../mappers/user.mapper';
import { PrismaAuthorizationRepository } from './AuthorizationRepository';

const authorizationRepository = new PrismaAuthorizationRepository();

function mapResourceListItem(profile: {
  id: number;
  userId: number;
  managerId: number | null;
  resourceStatus: EmployeeListItem['status'];
  user: {
    fullName: string;
    department: EmployeeListItem['department'];
    designation: EmployeeListItem['designation'];
    isActive: boolean;
  };
  manager: { fullName: string } | null;
}): EmployeeListItem {
  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.user.fullName,
    department: profile.user.department,
    designation: profile.user.designation,
    status: profile.resourceStatus,
    isActive: profile.user.isActive,
    managerId: profile.managerId,
    managerName: profile.manager?.fullName ?? null,
  };
}

async function mapUserToProfile(user: {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department: UserProfile['department'];
  designation: UserProfile['designation'];
  forcePasswordChange: boolean;
}): Promise<UserProfile> {
  const [role, permissions] = await Promise.all([
    authorizationRepository.getPrimaryRoleName(user.id),
    authorizationRepository.getPermissionKeysForUser(user.id),
  ]);

  if (!role) {
    throw new Error(`User ${user.id} has no primary role`);
  }

  return mapToUserProfile({
    ...user,
    role,
    permissions,
  });
}

export class PrismaAdminUserRepository implements IAdminUserRepository {
  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const roleId = await authorizationRepository.findRoleIdByName(input.role);
    if (!roleId) {
      throw new AppError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        `Role "${input.role}" is not configured. Run: npx prisma db seed`,
        ErrorTitles.INTERNAL_SERVER_ERROR,
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          fullName: input.fullName,
          passwordHash: input.passwordHash,
          department: input.department,
          designation: input.designation,
          isActive: true,
          forcePasswordChange: true,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId,
          isPrimary: true,
        },
      });

      if (!requiresResourceProfile(input.role)) {
        return { user, profile: undefined };
      }

      const profile = await tx.resourceProfile.create({
        data: {
          userId: user.id,
          managerId: null,
        },
        include: {
          user: { select: { fullName: true, department: true, designation: true, isActive: true } },
          manager: { select: { fullName: true } },
        },
      });

      return { user, profile };
    });

    const permissions = await authorizationRepository.getPermissionKeysForUser(created.user.id);

    return {
      user: mapToUserProfile({
        ...created.user,
        role: input.role,
        permissions,
      }),
      employee: created.profile !== undefined ? mapResourceListItem(created.profile) : undefined,
    };
  }

  async listUsers(): Promise<AdminUserListResult> {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      include: {
        userRoles: {
          where: { isPrimary: true },
          include: { role: true },
        },
      },
    });

    const mapped = users.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: (user.userRoles[0]?.role.roleName ?? 'RESOURCE') as AdminUserListResult['users'][number]['role'],
      isActive: user.isActive,
    }));

    const active = mapped.filter((user) => user.isActive).length;

    return {
      users: mapped,
      summary: {
        total: mapped.length,
        active,
        inactive: mapped.length - active,
      },
    };
  }

  async findUserProfileById(userId: number): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? mapUserToProfile(user) : null;
  }

  async findUserProfileByUsername(username: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? mapUserToProfile(user) : null;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { username } });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } });
    return count > 0;
  }

  async setActiveStatus(userId: number, isActive: boolean): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return mapUserToProfile(user);
  }

  async resetPassword(userId: number, passwordHash: string): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        forcePasswordChange: true,
      },
    });

    return mapUserToProfile(user);
  }
}
