import { Department, Designation } from '@prisma/client';
import { RoleName } from '../../../shared/constants/roleNames';
import { UserProfile, UserRecord } from '../../../domain/types/user.types';

export function mapToUserProfile(input: {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department: Department | null;
  designation: Designation | null;
  role: RoleName;
  permissions: string[];
  forcePasswordChange: boolean;
}): UserProfile {
  return {
    id: input.id,
    username: input.username,
    email: input.email,
    fullName: input.fullName,
    department: input.department,
    designation: input.designation,
    role: input.role,
    permissions: input.permissions,
    forcePasswordChange: input.forcePasswordChange,
  };
}

export function mapToUserRecord(input: {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department: Department | null;
  designation: Designation | null;
  role: RoleName;
  permissions: string[];
  isActive: boolean;
  forcePasswordChange: boolean;
  passwordHash: string;
}): UserRecord {
  return {
    ...mapToUserProfile(input),
    isActive: input.isActive,
    passwordHash: input.passwordHash,
  };
}
