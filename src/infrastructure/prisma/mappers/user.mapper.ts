import { UserProfile } from '../../../domain/types/user.types';

export function mapToUserProfile(user: {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserProfile['role'];
  forcePasswordChange: boolean;
}): UserProfile {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    forcePasswordChange: user.forcePasswordChange,
  };
}
