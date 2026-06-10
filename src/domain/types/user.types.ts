import { Role } from '@prisma/client';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  forcePasswordChange: boolean;
}

export interface UserRecord extends UserProfile {
  passwordHash: string;
  isActive: boolean;
}
