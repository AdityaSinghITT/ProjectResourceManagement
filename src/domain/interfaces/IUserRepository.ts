import { UserProfile, UserRecord } from '../types/user.types';

export interface UpdatePasswordInput {
  userId: number;
  passwordHash: string;
  forcePasswordChange: boolean;
}

export interface IUserRepository {
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(userId: number): Promise<UserRecord | null>;
  updatePassword(input: UpdatePasswordInput): Promise<UserProfile>;
}
