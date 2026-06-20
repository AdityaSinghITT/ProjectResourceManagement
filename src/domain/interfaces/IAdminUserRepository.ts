import { Department, Designation } from '@prisma/client';
import { RoleName } from '../../shared/constants/roleNames';
import { AdminUserListResult, CreateUserResult, EmployeeListItem } from '../types/admin.types';
import { UserProfile } from '../types/user.types';

export interface CreateUserInput {
  username: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: RoleName;
  department?: Department;
  designation?: Designation;
}

export interface IAdminUserRepository {
  createUser(input: CreateUserInput): Promise<CreateUserResult>;
  listUsers(): Promise<AdminUserListResult>;
  findUserProfileById(userId: number): Promise<UserProfile | null>;
  findUserProfileByUsername(username: string): Promise<UserProfile | null>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  setActiveStatus(userId: number, isActive: boolean): Promise<UserProfile>;
  resetPassword(userId: number, passwordHash: string): Promise<UserProfile>;
}

export type { EmployeeListItem };
