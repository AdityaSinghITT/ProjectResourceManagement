import { prisma } from '../client';
import {
  CreateUserInput,
  IAdminUserRepository,
} from '../../../domain/interfaces/IAdminUserRepository';
import { AdminUserListResult, CreateUserResult, EmployeeListItem } from '../../../domain/types/admin.types';
import { UserProfile } from '../../../domain/types/user.types';
import { requiresEmployeeProfile } from '../../../shared/domain/roleRules';
import { mapToUserProfile } from '../mappers/user.mapper';

function mapEmployeeListItem(employee: {
  id: number;
  userId: number;
  managerId: number | null;
  department: string;
  designation: string;
  status: EmployeeListItem['status'];
  isActive: boolean;
  user: { fullName: string };
  manager: { fullName: string } | null;
}): EmployeeListItem {
  return {
    id: employee.id,
    userId: employee.userId,
    fullName: employee.user.fullName,
    department: employee.department,
    designation: employee.designation,
    status: employee.status,
    isActive: employee.isActive,
    managerId: employee.managerId,
    managerName: employee.manager?.fullName ?? null,
  };
}

export class PrismaAdminUserRepository implements IAdminUserRepository {
  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          fullName: input.fullName,
          passwordHash: input.passwordHash,
          role: input.role,
          isActive: true,
          forcePasswordChange: true,
        },
      });

      if (!requiresEmployeeProfile(input.role)) {
        return { user: mapToUserProfile(user), employee: undefined };
      }

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          managerId: null,
          department: input.department!,
          designation: input.designation!,
        },
        include: {
          user: { select: { fullName: true } },
          manager: { select: { fullName: true } },
        },
      });

      return {
        user: mapToUserProfile(user),
        employee: mapEmployeeListItem(employee),
      };
    });

    return result;
  }

  async listUsers(): Promise<AdminUserListResult> {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    const active = users.filter((user) => user.isActive).length;

    return {
      users,
      summary: {
        total: users.length,
        active,
        inactive: users.length - active,
      },
    };
  }

  async findUserProfileById(userId: number): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? mapToUserProfile(user) : null;
  }

  async findUserProfileByUsername(username: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? mapToUserProfile(user) : null;
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

    return mapToUserProfile(user);
  }

  async resetPassword(userId: number, passwordHash: string): Promise<UserProfile> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        forcePasswordChange: true,
      },
    });

    return mapToUserProfile(user);
  }
}
