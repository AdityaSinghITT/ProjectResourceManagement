import { prisma } from '../client';
import {
  IUserRepository,
  UpdatePasswordInput,
} from '../../../domain/interfaces/IUserRepository';
import { UserProfile, UserRecord } from '../../../domain/types/user.types';
import { mapToUserProfile } from '../mappers/user.mapper';

function mapToUserRecord(user: {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRecord['role'];
  isActive: boolean;
  forcePasswordChange: boolean;
  passwordHash: string;
}): UserRecord {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
    forcePasswordChange: user.forcePasswordChange,
    passwordHash: user.passwordHash,
  };
}

export class PrismaUserRepository implements IUserRepository {
  async findByUsername(username: string): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? mapToUserRecord(user) : null;
  }

  async findById(userId: number): Promise<UserRecord | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? mapToUserRecord(user) : null;
  }

  async updatePassword(input: UpdatePasswordInput): Promise<UserProfile> {
    const updatedUser = await prisma.user.update({
      where: { id: input.userId },
      data: {
        passwordHash: input.passwordHash,
        forcePasswordChange: input.forcePasswordChange,
      },
    });

    return mapToUserProfile(updatedUser);
  }
}
