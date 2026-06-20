import request from 'supertest';
import {
  app,
  authHeader,
  getIntegrationContext,
  IntegrationTestContext,
  integrationPaths,
  teardownIntegrationSuite,
} from './helpers';

jest.setTimeout(120000);

describe('RBAC API integration', () => {
  let users: IntegrationTestContext;

  beforeAll(async () => {
    users = await getIntegrationContext();
  });

  afterAll(async () => {
    await teardownIntegrationSuite();
  });

  describe('role permissions in JWT', () => {
    it('manager permissions match BRD manager scope', () => {
      expect(users.manager.permissions).toEqual(
        expect.arrayContaining([
          'DASHBOARD:READ',
          'ALLOCATIONS:CREATE',
          'TIMESHEETS:VIEW_TEAM',
        ]),
      );
      expect(users.manager.permissions).not.toContain('USERS:CREATE');
      expect(users.manager.permissions).not.toContain('SYSTEM_CONFIG:UPDATE');
    });

    it('resource permissions match BRD employee scope', () => {
      expect(users.resource.permissions).toEqual(
        expect.arrayContaining(['TIMESHEETS:SUBMIT', 'TIMESHEETS:READ', 'ALLOCATIONS:READ']),
      );
      expect(users.resource.permissions).not.toContain('DASHBOARD:READ');
      expect(users.resource.permissions).not.toContain('USERS:LIST');
    });
  });

  describe('cross-role access denials (BRD boundaries)', () => {
    it('admin cannot access manager dashboard', async () => {
      const response = await request(app)
        .get(integrationPaths.managerDashboard)
        .set(authHeader(users.admin.token));

      expect(response.status).toBe(403);
    });

    it('admin cannot access employee timesheets', async () => {
      const response = await request(app)
        .get(integrationPaths.employeeTimesheets)
        .set(authHeader(users.admin.token));

      expect(response.status).toBe(403);
    });

    it('manager cannot access admin user list', async () => {
      const response = await request(app)
        .get(integrationPaths.adminUsers)
        .set(authHeader(users.manager.token));

      expect(response.status).toBe(403);
    });

    it('manager cannot access system configuration', async () => {
      const response = await request(app)
        .get(integrationPaths.adminSystemConfig)
        .set(authHeader(users.manager.token));

      expect(response.status).toBe(403);
    });

    it('resource cannot create admin users', async () => {
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.resource.token))
        .send({
          fullName: 'Blocked User',
          email: 'blocked@test.local',
          username: 'blocked_user',
          temporaryPassword: 'Temp@1234',
          role: 'RESOURCE',
          department: 'ENGINEERING',
          designation: 'SOFTWARE_ENGINEER',
        });

      expect(response.status).toBe(403);
    });

    it('resource cannot access manager team timesheets', async () => {
      const response = await request(app)
        .get(integrationPaths.managerTimesheets)
        .set(authHeader(users.resource.token));

      expect(response.status).toBe(403);
    });

    it('unauthenticated requests are rejected', async () => {
      const response = await request(app).get(integrationPaths.adminUsers);

      expect(response.status).toBe(401);
    });
  });

  describe('allowed routes per role', () => {
    it('admin can list users and allocations matrix', async () => {
      const usersResponse = await request(app)
        .get(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token));
      const allocationsResponse = await request(app)
        .get(integrationPaths.adminAllocations)
        .set(authHeader(users.admin.token));

      expect(usersResponse.status).toBe(200);
      expect(allocationsResponse.status).toBe(200);
    });

    it('manager can access dashboard and projects', async () => {
      const dashboardResponse = await request(app)
        .get(integrationPaths.managerDashboard)
        .set(authHeader(users.manager.token));
      const projectsResponse = await request(app)
        .get(integrationPaths.managerProjects)
        .set(authHeader(users.manager.token));

      expect(dashboardResponse.status).toBe(200);
      expect(projectsResponse.status).toBe(200);
    });

    it('resource can access own timesheets and allocations', async () => {
      const timesheetsResponse = await request(app)
        .get(integrationPaths.employeeTimesheets)
        .set(authHeader(users.resource.token));
      const allocationsResponse = await request(app)
        .get(integrationPaths.employeeAllocations)
        .set(authHeader(users.resource.token));

      expect(timesheetsResponse.status).toBe(200);
      expect(allocationsResponse.status).toBe(200);
    });

    it('all roles can list activity tags when authenticated', async () => {
      for (const session of [users.admin, users.manager, users.resource]) {
        const response = await request(app)
          .get(integrationPaths.activityTags)
          .set(authHeader(session.token));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.tags)).toBe(true);
      }
    });
  });
});
