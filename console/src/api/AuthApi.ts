import { HttpClient } from './HttpClient';
import { ChangePasswordResult, LoginResult, UserProfile } from './types/auth.types';

export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  login(username: string, password: string): Promise<LoginResult> {
    return this.http.post<LoginResult>('/api/auth/login', { username, password });
  }

  changePassword(newPassword: string, confirmPassword: string): Promise<ChangePasswordResult> {
    return this.http.post<ChangePasswordResult>('/api/auth/change-password', {
      newPassword,
      confirmPassword,
    });
  }

  getProfile(): Promise<UserProfile> {
    return this.http.get<UserProfile>('/api/auth/me');
  }

  logout(): Promise<{ message: string }> {
    return this.http.post<{ message: string }>('/api/auth/logout');
  }
}
