import { UserProfile } from '../api/types/auth.types';

export class SessionStore {
  private token: string | null = null;
  private user: UserProfile | null = null;

  setSession(token: string, user: UserProfile): void {
    this.token = token;
    this.user = user;
  }

  updateUser(user: UserProfile): void {
    this.user = user;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): UserProfile | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.user !== null;
  }

  clear(): void {
    this.token = null;
    this.user = null;
  }
}
