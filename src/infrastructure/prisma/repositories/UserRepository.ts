import { prisma } from '../client';
import {
  IUserRepository,
  UpdatePasswordInput,
} from '../../../domain/interfaces/IUserRepository';
import { UserProfile, UserRecord } from '../../../domain/types/user.types';
import { mapToUserProfile, mapToUserRecord } from '../mappers/user.mapper';
import { PrismaAuthorizationRepository } from './AuthorizationRepository';

const authorizationRepository = new PrismaAuthorizationRepository();

async function enrichUserRecord(user: {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department: UserRecord['department'];
  designation: UserRecord['designation'];
  isActive: boolean;
  forcePasswordChange: boolean;
  passwordHash: string;
}): Promise<UserRecord> {
  const [role, permissions] = await Promise.all([
    authorizationRepository.getPrimaryRoleName(user.id),
    authorizationRepository.getPermissionKeysForUser(user.id),
  ]);

  if (!role) {
    throw new Error(`User ${user.id} has no primary role assigned`);
  }

  return mapToUserRecord({
    ...user,
    role,
    permissions,
  });
}

async function enrichUserProfile(user: {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department: UserProfile['department'];
  designation: UserProfile['designation'];
  forcePasswordChange: boolean;
}): Promise<UserProfile> {
  const record = await enrichUserRecord({ ...user, isActive: true, passwordHash: '' });
  return mapToUserProfile(record);
}

export class PrismaUserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? enrichUserRecord(user) : null;
  }

  async findById(userId: number): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? enrichUserRecord(user) : null;
  }

  async updatePassword(input: UpdatePasswordInput): Promise<UserProfile> {
    const updatedUser = await prisma.user.update({
      where: { id: input.userId },
      data: {
        passwordHash: input.passwordHash,
        forcePasswordChange: input.forcePasswordChange,
      },
    });

    return enrichUserProfile(updatedUser);
  }
}
