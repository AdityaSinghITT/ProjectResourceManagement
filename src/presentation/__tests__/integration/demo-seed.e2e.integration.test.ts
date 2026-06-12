import request from 'supertest';
import { AdminRoutes, ApiRoutes, AuthRoutes, EmployeeRoutes, ManagerRoutes } from '../../../shared/constants/apiRoutes';
import { formatDateOnly } from '../../../shared/utils/date.utils';
import { addDays, getWeekStart } from '../../../application/utils/week.utils';
import {
  DEMO_ACCOUNTS,
  isDemoSeedPresent,
  loginDemoAdminWithPasswordChanged,
  loginDemoUser,
} from './demoSeed.helpers';
import { app, authHeader, disconnectIntegrationDb, integrationPaths, loginRequest } from './helpers';

jest.setTimeout(120000);

describe('Milestone 2 E2E (demo seed data)', () => {
  let demoAvailable = false;
  let adminToken = '';
  let managerToken = '';
  let raviToken = '';
  let raviProfileId = 0;
  let alphaPortalProjectId = 0;

  beforeAll(async () => {
    demoAvailable = await isDemoSeedPresent();
    if (!demoAvailable) {
      console.warn('Skipping E2E: run `npx prisma db seed` to create demo accounts first.');
      return;
    }

    adminToken = await loginDemoAdminWithPasswordChanged();
    const manager = await loginDemoUser(DEMO_ACCOUNTS.manager.username, DEMO_ACCOUNTS.manager.password);
    managerToken = manager.token;

    const ravi = await loginDemoUser(DEMO_ACCOUNTS.resourceRavi.username, DEMO_ACCOUNTS.resourceRavi.password);
    raviToken = ravi.token;

    const employeesResponse = await request(app)
      .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.EMPLOYEES}`)
      .set(authHeader(adminToken));

    expect(employeesResponse.status).toBe(200);
    const employees = employeesResponse.body.employees as Array<{
      id: number;
      fullName: string;
      status: string;
    }>;

    const raviRow = employees.find((row) => row.fullName === 'Ravi Kumar');
    const priyaRow = employees.find((row) => row.fullName === 'Priya Sharma');
    if (!raviRow || !priyaRow) {
      throw new Error('Demo employees Ravi Kumar / Priya Sharma not found — re-run seed');
    }

    raviProfileId = raviRow.id;

    const projectsResponse = await request(app)
      .get(`${ApiRoutes.MANAGER_BASE}${ManagerRoutes.PROJECTS}`)
      .set(authHeader(managerToken));

    const project = (projectsResponse.body.projects as Array<{ id: number; name: string }>).find(
      (item) => item.name === DEMO_ACCOUNTS.projectName,
    );
    if (!project) {
      throw new Error('Demo project Alpha Portal not found — re-run seed');
    }
    alphaPortalProjectId = project.id;
  });

  afterAll(async () => {
    await disconnectIntegrationDb();
  });

  const itIfDemo = (name: string, fn: () => Promise<void>) => {
    it(name, async () => {
      if (!demoAvailable) {
        return;
      }
      await fn();
    });
  };

  describe('Auth', () => {
    itIfDemo('health check returns connected', async () => {
      const response = await request(app).get(integrationPaths.health);
      expect(response.status).toBe(200);
      expect(response.body.database).toBe('connected');
    });

    itIfDemo('demo manager login returns RESOURCE role permissions in JWT', async () => {
      const response = await loginRequest(DEMO_ACCOUNTS.manager.username, DEMO_ACCOUNTS.manager.password);
      expect(response.body.user.role).toBe('MANAGER');
      expect(response.body.user.permissions).toContain('DASHBOARD:READ');
    });

    itIfDemo('admin can access /me after password change', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.AUTH_BASE}${AuthRoutes.ME}`)
        .set(authHeader(adminToken));
      expect(response.status).toBe(200);
      expect(response.body.user.role).toBe('ADMIN');
    });
  });

  describe('Admin flows (BRD §3)', () => {
    itIfDemo('lists users, employees, allocations, and system config', async () => {
      const users = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.USERS}`)
        .set(authHeader(adminToken));
      const employees = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.EMPLOYEES}`)
        .set(authHeader(adminToken));
      const allocations = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.ALLOCATIONS}`)
        .set(authHeader(adminToken));
      const config = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.SYSTEM_CONFIG}`)
        .set(authHeader(adminToken));

      expect(users.status).toBe(200);
      expect(employees.status).toBe(200);
      expect(allocations.status).toBe(200);
      expect(config.status).toBe(200);
      expect(config.body.config.schedulerIntervalHours).toBeGreaterThan(0);
    });

    itIfDemo('filters allocations by resource profile ID', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.ALLOCATIONS}`)
        .query({ resourceProfileId: raviProfileId })
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.allocations.length).toBeGreaterThan(0);
      expect(response.body.allocations.every((row: { employeeName: string }) => row.employeeName === 'Ravi Kumar')).toBe(
        true,
      );
    });

    itIfDemo('deactivation preview shows resourceStatus for Ravi', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.EMPLOYEE_DEACTIVATE}/preview`.replace(':id', String(raviProfileId)))
        .set(authHeader(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.employee.resourceStatus).toBeDefined();
    });
  });

  describe('Manager flows (BRD §3.2)', () => {
    itIfDemo('dashboard shows bench and allocated team members', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.MANAGER_BASE}${ManagerRoutes.DASHBOARD}`)
        .set(authHeader(managerToken));

      expect(response.status).toBe(200);
      const benchNames = (response.body.bench as Array<{ fullName: string }>).map((row) => row.fullName);
      const activeNames = (response.body.active as Array<{ fullName: string }>).map((row) => row.fullName);
      expect(benchNames).toContain('Priya Sharma');
      expect(activeNames).toContain('Ravi Kumar');
    });

    itIfDemo('lists Alpha Portal with health status and detail', async () => {
      const list = await request(app)
        .get(`${ApiRoutes.MANAGER_BASE}${ManagerRoutes.PROJECTS}`)
        .set(authHeader(managerToken));
      expect(list.status).toBe(200);

      const alpha = (list.body.projects as Array<{ id: number; healthStatus: string }>).find(
        (p) => p.id === alphaPortalProjectId,
      );
      expect(alpha?.healthStatus).toMatch(/ON_TRACK|ATTENTION|AT_RISK/);

      const detail = await request(app)
        .get(`${ApiRoutes.MANAGER_BASE}${ManagerRoutes.PROJECT_BY_ID}`.replace(':id', String(alphaPortalProjectId)))
        .set(authHeader(managerToken));
      expect(detail.status).toBe(200);
      expect(detail.body.health).toBeDefined();
      expect(Array.isArray(detail.body.health.riskFlags)).toBe(true);
    });

    itIfDemo('employee drill-down returns skills and allocations', async () => {
      const response = await request(app)
        .get(
          `${ApiRoutes.MANAGER_BASE}${ManagerRoutes.DASHBOARD_EMPLOYEE}`.replace(':id', String(raviProfileId)),
        )
        .set(authHeader(managerToken));

      expect(response.status).toBe(200);
      expect(response.body.profileSkills.length).toBeGreaterThan(0);
      expect(response.body.activeAllocations.length).toBeGreaterThan(0);
    });

    itIfDemo('team timesheets grid includes resourceProfileId for Ravi', async () => {
      const priorWeek = formatDateOnly(addDays(getWeekStart(new Date()), -7));
      const response = await request(app)
        .get(`${ApiRoutes.MANAGER_BASE}${ManagerRoutes.TIMESHEETS}`)
        .query({ weekStart: priorWeek })
        .set(authHeader(managerToken));

      expect(response.status).toBe(200);
      const raviRows = (response.body.rows as Array<{ resourceProfileId: number; employeeName: string }>).filter(
        (row) => row.employeeName === 'Ravi Kumar',
      );
      expect(raviRows.length).toBeGreaterThan(0);
      expect(raviRows[0].resourceProfileId).toBe(raviProfileId);
    });

    itIfDemo('AI skill-match route is registered', async () => {
      const unauthenticated = await request(app)
        .post(`${ApiRoutes.MANAGER_BASE}${ManagerRoutes.AI_SKILL_MATCH}`)
        .send({ requirement: 'React developer 50%' });
      expect(unauthenticated.status).toBe(401);
    });
  });

  describe('Resource flows (BRD §3.3)', () => {
    itIfDemo('lists own allocations on Alpha Portal', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.EMPLOYEE_BASE}${EmployeeRoutes.ALLOCATIONS}`)
        .set(authHeader(raviToken));

      expect(response.status).toBe(200);
      const names = (response.body.allocations as Array<{ projectName: string }>).map((a) => a.projectName);
      expect(names).toContain(DEMO_ACCOUNTS.projectName);
    });

    itIfDemo('timesheet history includes seeded SUBMITTED week', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.EMPLOYEE_BASE}${EmployeeRoutes.TIMESHEETS}`)
        .set(authHeader(raviToken));

      expect(response.status).toBe(200);
      const submitted = (response.body.timesheets as Array<{ status: string }>).some(
        (row) => row.status === 'SUBMITTED',
      );
      expect(submitted).toBe(true);
    });

    itIfDemo('activity tags catalog is available', async () => {
      const response = await request(app)
        .get(integrationPaths.activityTags)
        .set(authHeader(raviToken));

      expect(response.status).toBe(200);
      expect(response.body.tags.length).toBeGreaterThanOrEqual(11);
    });
  });

  describe('RBAC on demo accounts', () => {
    itIfDemo('resource cannot access admin users', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.USERS}`)
        .set(authHeader(raviToken));
      expect(response.status).toBe(403);
    });

    itIfDemo('manager cannot access system config', async () => {
      const response = await request(app)
        .get(`${ApiRoutes.ADMIN_BASE}${AdminRoutes.SYSTEM_CONFIG}`)
        .set(authHeader(managerToken));
      expect(response.status).toBe(403);
    });

    itIfDemo('priya cannot access manager dashboard', async () => {
      const priya = await loginDemoUser(DEMO_ACCOUNTS.resourcePriya.username, DEMO_ACCOUNTS.resourcePriya.password);
      const response = await request(app)
        .get(`${ApiRoutes.MANAGER_BASE}${ManagerRoutes.DASHBOARD}`)
        .set(authHeader(priya.token));
      expect(response.status).toBe(403);
    });
  });
});
