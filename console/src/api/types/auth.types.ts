export type UserRole = 'ADMIN' | 'MANAGER' | 'RESOURCE' | 'EMPLOYEE';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
  designation?: string | null;
  permissions?: string[];
  forcePasswordChange: boolean;
}

export interface LoginResult {
  token: string;
  user: UserProfile;
}

export interface ChangePasswordResult {
  message: string;
  token: string;
  user: UserProfile;
}
