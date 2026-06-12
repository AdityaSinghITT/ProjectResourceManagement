import bcrypt from 'bcrypt';
import request, { Response } from 'supertest';
import { Department, Designation } from '@prisma/client';
import { createApp } from '../../../app';
import { prisma } from '../../../infrastructure/prisma/client';
import { PrismaAuthorizationRepository } from '../../../infrastructure/prisma/repositories/AuthorizationRepository';
import {
  AdminRoutes,
  ApiRoutes,
  AuthRoutes,
  EmployeeRoutes,
  ManagerRoutes,
} from '../../../shared/constants/apiRoutes';
import { RoleName, RoleNames } from '../../../shared/constants/roleNames';

export const TEST_PREFIX = 'inttest';
export const TEST_PASSWORD = 'Test@1234';

export const app = createApp();
export const authorizationRepository = new PrismaAuthorizationRepository();

export interface TestSession {
  userId: number;
  username: string;
  token: string;
  role: RoleName;
  permissions: string[];
  resourceProfileId?: number;
}

export interface IntegrationTestContext {
  admin: TestSession;
  manager: TestSession;
  resource: TestSession;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function loginRequest(username: string, password: string): Promise<Response> {
  return request(app)
    .post(`${ApiRoutes.AUTH_BASE}${AuthRoutes.LOGIN}`)
    .send({ username, password });
}

async function deleteProjectsManagedByUser(userId: number): Promise<void> {
  const projectIds = (
    await prisma.project.findMany({
      where: { managerId: userId },
      select: { id: true },
    })
  ).map((project) => project.id);

  if (projectIds.length > 0) {
    await prisma.allocation.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.timesheetEntry.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.milestone.deleteMany({ where: { projectId: { in: projectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }
}

async function createUserRecord(
  suffix: string,
  role: RoleName,
  options?: { department?: Department; designation?: Designation },
): Promise<TestSession> {
  const username = `${TEST_PREFIX}_${suffix}`;
  const email = `${username}@test.local`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    await deleteProjectsManagedByUser(existing.id);
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      fullName: `Integration ${suffix}`,
      passwordHash,
      isActive: true,
      forcePasswordChange: false,
      department: options?.department,
      designation: options?.designation,
    },
  });

  await authorizationRepository.assignPrimaryRole(user.id, role);

  let resourceProfileId: number | undefined;
  if (role === RoleNames.MANAGER || role === RoleNames.RESOURCE) {
    const profile = await prisma.resourceProfile.create({
      data: {
        userId: user.id,
        resourceStatus: 'BENCH',
      },
    });
    resourceProfileId = profile.id;
  }

  const loginResponse = await loginRequest(username, TEST_PASSWORD);
  if (loginResponse.status !== 200) {
    throw new Error(`Failed to login test user ${username}: ${loginResponse.text}`);
  }

  return {
    userId: user.id,
    username,
    token: loginResponse.body.token,
    role: loginResponse.body.user.role,
    permissions: loginResponse.body.user.permissions,
    resourceProfileId,
  };
}

export async function seedIntegrationUsers(): Promise<IntegrationTestContext> {
  const [admin, manager, resource] = await Promise.all([
    createUserRecord('admin', RoleNames.ADMIN),
    createUserRecord('manager', RoleNames.MANAGER, {
      department: Department.ENGINEERING,
      designation: Designation.PROJECT_MANAGER,
    }),
    createUserRecord('resource', RoleNames.RESOURCE, {
      department: Department.ENGINEERING,
      designation: Designation.SOFTWARE_ENGINEER,
    }),
  ]);

  return { admin, manager, resource };
}

let cachedContext: Promise<IntegrationTestContext> | undefined;
let teardownCompleted = false;

export function getIntegrationContext(): Promise<IntegrationTestContext> {
  if (!cachedContext) {
    cachedContext = seedIntegrationUsers();
  }
  return cachedContext;
}

export async function cleanupIntegrationUsers(): Promise<void> {
  const testUsers = await prisma.user.findMany({
    where: { username: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const testUserIds = testUsers.map((user) => user.id);

  for (const userId of testUserIds) {
    await deleteProjectsManagedByUser(userId);
  }

  await prisma.user.deleteMany({
    where: {
      username: {
        startsWith: TEST_PREFIX,
      },
    },
  });
  cachedContext = undefined;
}

export async function disconnectIntegrationDb(): Promise<void> {
  await prisma.$disconnect();
}

export async function teardownIntegrationSuite(): Promise<void> {
  if (teardownCompleted) {
    return;
  }
  teardownCompleted = true;
  await cleanupIntegrationUsers();
  await disconnectIntegrationDb();
}

function adminPath(route: string): string {
  return `${ApiRoutes.ADMIN_BASE}${route}`;
}

function adminPathWithId(route: string, id: number | string): string {
  return adminPath(route).replace(':id', String(id));
}

export const integrationPaths = {
  health: ApiRoutes.HEALTH,
  login: `${ApiRoutes.AUTH_BASE}${AuthRoutes.LOGIN}`,
  me: `${ApiRoutes.AUTH_BASE}${AuthRoutes.ME}`,
  adminUsers: adminPath(AdminRoutes.USERS),
  adminUserReactivate: (userId: number) => adminPathWithId(AdminRoutes.USER_REACTIVATE, userId),
  adminUserDeactivate: (userId: number) => adminPathWithId(AdminRoutes.USER_DEACTIVATE, userId),
  adminUserResetPassword: (userId: number) => adminPathWithId(AdminRoutes.USER_RESET_PASSWORD, userId),
  adminUserResetPasswordLookup: adminPath(AdminRoutes.USER_RESET_PASSWORD_LOOKUP),
  adminEmployees: adminPath(AdminRoutes.EMPLOYEES),
  adminProjects: adminPath(AdminRoutes.PROJECTS),
  adminProjectById: (projectId: number) => adminPathWithId(AdminRoutes.PROJECT_BY_ID, projectId),
  adminProjectMilestones: (projectId: number) =>
    adminPathWithId(AdminRoutes.PROJECT_MILESTONES, projectId),
  adminProjectMilestoneById: (projectId: number, milestoneId: number) =>
    adminPath(AdminRoutes.PROJECT_MILESTONE_BY_ID)
      .replace(':id', String(projectId))
      .replace(':milestoneId', String(milestoneId)),
  adminSystemConfig: adminPath(AdminRoutes.SYSTEM_CONFIG),
  adminAllocations: adminPath(AdminRoutes.ALLOCATIONS),
  managerDashboard: `${ApiRoutes.MANAGER_BASE}${ManagerRoutes.DASHBOARD}`,
  managerProjects: `${ApiRoutes.MANAGER_BASE}${ManagerRoutes.PROJECTS}`,
  managerTimesheets: `${ApiRoutes.MANAGER_BASE}${ManagerRoutes.TIMESHEETS}`,
  employeeTimesheets: `${ApiRoutes.EMPLOYEE_BASE}${EmployeeRoutes.TIMESHEETS}`,
  employeeAllocations: `${ApiRoutes.EMPLOYEE_BASE}${EmployeeRoutes.ALLOCATIONS}`,
  activityTags: ApiRoutes.ACTIVITY_TAGS,
};
