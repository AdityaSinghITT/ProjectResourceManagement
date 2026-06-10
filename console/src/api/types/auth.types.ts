export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
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
