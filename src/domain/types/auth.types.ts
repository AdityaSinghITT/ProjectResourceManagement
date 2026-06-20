import { RoleName } from '../../shared/constants/roleNames';
import { UserProfile } from './user.types';

export interface AccessTokenClaims {
  sub: number;
  username: string;
  role: RoleName;
  permissions: string[];
  forcePasswordChange: boolean;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: RoleName;
  permissions: string[];
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
