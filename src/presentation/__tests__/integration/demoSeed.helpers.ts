import request from 'supertest';
import { prisma } from '../../../infrastructure/prisma/client';
import { ApiRoutes, AuthRoutes } from '../../../shared/constants/apiRoutes';
import { app, authHeader, loginRequest } from './helpers';

export const DEMO_ACCOUNTS = {
  admin: { username: 'admin', password: 'Admin@1234' },
  adminChangedPassword: 'Admin@Test99',
  manager: { username: 'ankit.shah', password: 'Manager@1234' },
  resourceRavi: { username: 'ravi.kumar', password: 'Resource@1234' },
  resourcePriya: { username: 'priya.sharma', password: 'Resource@1234' },
  projectName: 'Alpha Portal',
} as const;

export async function isDemoSeedPresent(): Promise<boolean> {
  const manager = await prisma.user.findUnique({
    where: { username: DEMO_ACCOUNTS.manager.username },
  });
  return manager !== null;
}

export async function loginDemoUser(
  username: string,
  password: string,
): Promise<{ token: string; user: Record<string, unknown> }> {
  const response = await loginRequest(username, password);
  if (response.status !== 200) {
    throw new Error(`Demo login failed for ${username}: ${response.status} ${response.text}`);
  }
  return { token: response.body.token, user: response.body.user };
}

/** Admin seed account must change password before protected routes. */
export async function loginDemoAdminWithPasswordChanged(): Promise<string> {
  const login = await loginDemoUser(DEMO_ACCOUNTS.admin.username, DEMO_ACCOUNTS.admin.password);

  if (!login.user.forcePasswordChange) {
    return login.token;
  }

  const changeResponse = await request(app)
    .post(`${ApiRoutes.AUTH_BASE}${AuthRoutes.CHANGE_PASSWORD}`)
    .set(authHeader(login.token))
    .send({
      newPassword: DEMO_ACCOUNTS.adminChangedPassword,
      confirmPassword: DEMO_ACCOUNTS.adminChangedPassword,
    });

  if (changeResponse.status !== 200) {
    throw new Error(`Admin password change failed: ${changeResponse.text}`);
  }

  return changeResponse.body.token as string;
}
