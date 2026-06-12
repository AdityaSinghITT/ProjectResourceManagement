import { Department, Designation } from '@prisma/client';
import { RoleName } from '../../shared/constants/roleNames';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: RoleName;
  department: Department | null;
  designation: Designation | null;
  permissions: string[];
  forcePasswordChange: boolean;
}

export interface UserRecord extends UserProfile {
  passwordHash: string;
  isActive: boolean;
}
