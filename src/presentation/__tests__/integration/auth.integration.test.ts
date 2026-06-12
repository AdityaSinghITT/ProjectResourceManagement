import request from 'supertest';
import {
  app,
  authHeader,
  getIntegrationContext,
  integrationPaths,
  loginRequest,
  teardownIntegrationSuite,
  TEST_PASSWORD,
} from './helpers';

jest.setTimeout(120000);

describe('Auth API integration', () => {
  beforeAll(async () => {
    await getIntegrationContext();
  });

  afterAll(async () => {
    await teardownIntegrationSuite();
  });

  it('GET /api/health returns connected status', async () => {
    const response = await request(app).get(integrationPaths.health);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.database).toBe('connected');
  });

  it('POST /api/auth/login returns token and permissions for admin', async () => {
    const response = await loginRequest('inttest_admin', TEST_PASSWORD);

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.role).toBe('ADMIN');
    expect(response.body.user.permissions).toEqual(
      expect.arrayContaining(['USERS:CREATE', 'ALLOCATIONS:LIST']),
    );
    expect(response.body.user.permissions).not.toContain('TIMESHEETS:SUBMIT');
    expect(response.body.user.permissions).not.toContain('ALLOCATIONS:CREATE');
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const response = await loginRequest('inttest_admin', 'WrongPassword1');

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid/i);
  });

  it('GET /api/auth/me requires authentication', async () => {
    const response = await request(app).get(integrationPaths.me);

    expect(response.status).toBe(401);
  });

  it('GET /api/auth/me returns profile for authenticated user', async () => {
    const login = await loginRequest('inttest_manager', TEST_PASSWORD);

    const response = await request(app)
      .get(integrationPaths.me)
      .set(authHeader(login.body.token));

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe('inttest_manager');
    expect(response.body.user.role).toBe('MANAGER');
  });
});
