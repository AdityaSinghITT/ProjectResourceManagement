import { Department, Designation } from '@prisma/client';
import request from 'supertest';
import { AdminMessages } from '../../../shared/constants/adminMessages';
import { RoleNames } from '../../../shared/constants/roleNames';
import {
  app,
  authHeader,
  getIntegrationContext,
  IntegrationTestContext,
  integrationPaths,
  teardownIntegrationSuite,
  TEST_PREFIX,
} from './helpers';

jest.setTimeout(120000);

describe('Admin User API integration', () => {
  let users: IntegrationTestContext;
  let createdUserId = 0;
  let createdUsername = '';

  beforeAll(async () => {
    users = await getIntegrationContext();
  });

  afterAll(async () => {
    await teardownIntegrationSuite();
  });

  describe('POST /api/admin/users — Create User', () => {
    it('creates an admin user with valid payload', async () => {
      // Arrange
      createdUsername = `${TEST_PREFIX}_new_admin_${Date.now()}`;
      const payload = {
        fullName: 'Integration Admin',
        email: `${createdUsername}@test.local`,
        username: createdUsername,
        temporaryPassword: 'TempPass1',
        role: RoleNames.ADMIN,
      };

      // Act
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token))
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.USER_CREATED);
      expect(response.body.user).toMatchObject({
        username: createdUsername,
        email: payload.email,
        role: RoleNames.ADMIN,
      });
      createdUserId = response.body.user.id;
    });

    it('creates a resource user with employee profile when department and designation are provided', async () => {
      // Arrange
      const username = `${TEST_PREFIX}_new_resource_${Date.now()}`;
      const payload = {
        fullName: 'Integration Resource',
        email: `${username}@test.local`,
        username,
        temporaryPassword: 'TempPass1',
        role: RoleNames.RESOURCE,
        department: Department.ENGINEERING,
        designation: Designation.SOFTWARE_ENGINEER,
      };

      // Act
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token))
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.EMPLOYEE_PROFILE_CREATED);
      expect(response.body.employee).toMatchObject({
        fullName: payload.fullName,
        department: Department.ENGINEERING,
      });
    });

    it('returns 400 when required fields are missing', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token))
        .send({ username: 'only-username' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('returns 400 when password does not meet policy', async () => {
      // Arrange
      const username = `${TEST_PREFIX}_weak_pw_${Date.now()}`;

      // Act
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token))
        .send({
          fullName: 'Weak Password User',
          email: `${username}@test.local`,
          username,
          temporaryPassword: 'weak',
          role: RoleNames.ADMIN,
        });

      // Assert
      expect(response.status).toBe(400);
    });

    it('returns 400 when resource role is missing employee fields', async () => {
      // Arrange
      const username = `${TEST_PREFIX}_missing_fields_${Date.now()}`;

      // Act
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token))
        .send({
          fullName: 'Missing Fields',
          email: `${username}@test.local`,
          username,
          temporaryPassword: 'TempPass1',
          role: RoleNames.RESOURCE,
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/department|designation/i);
    });

    it('returns 400 when username already exists', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token))
        .send({
          fullName: 'Duplicate User',
          email: `duplicate_${Date.now()}@test.local`,
          username: createdUsername,
          temporaryPassword: 'TempPass1',
          role: RoleNames.ADMIN,
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(AdminMessages.USERNAME_EXISTS);
    });

    it('returns 403 when manager attempts to create a user', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminUsers)
        .set(authHeader(users.manager.token))
        .send({
          fullName: 'Forbidden',
          email: `forbidden_${Date.now()}@test.local`,
          username: `forbidden_${Date.now()}`,
          temporaryPassword: 'TempPass1',
          role: RoleNames.ADMIN,
        });

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/users — List Users', () => {
    it('returns user list for admin', async () => {
      // Act
      const response = await request(app)
        .get(integrationPaths.adminUsers)
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.summary).toMatchObject({
        total: expect.any(Number),
        active: expect.any(Number),
        inactive: expect.any(Number),
      });
    });
  });

  describe('PATCH /api/admin/users/:id/deactivate — Deactivate User', () => {
    it('deactivates an active user', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminUserDeactivate(createdUserId))
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.USER_DEACTIVATED);
      expect(response.body.user.id).toBe(createdUserId);
    });

    it('returns 409 when user is already inactive', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminUserDeactivate(createdUserId))
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.message).toBe(AdminMessages.USER_ALREADY_INACTIVE);
    });

    it('returns 404 when user id does not exist', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminUserDeactivate(9_999_999))
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toBe(AdminMessages.USER_NOT_FOUND);
    });
  });

  describe('PATCH /api/admin/users/:id/reactivate — Reactivate User', () => {
    it('reactivates a deactivated user', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminUserReactivate(createdUserId))
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toContain(AdminMessages.USER_REACTIVATED);
      expect(response.body.user.id).toBe(createdUserId);
    });

    it('returns 404 for unknown user id', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminUserReactivate(9_999_998))
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toBe(AdminMessages.USER_NOT_FOUND);
    });
  });

  describe('POST /api/admin/users/:id/reset-password — Reset Password', () => {
    it('resets password for an existing user', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminUserResetPassword(createdUserId))
        .set(authHeader(users.admin.token))
        .send({ newTemporaryPassword: 'ResetPass1' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.PASSWORD_RESET);
      expect(response.body.user.id).toBe(createdUserId);
    });

    it('returns 400 when new password is weak', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminUserResetPassword(createdUserId))
        .set(authHeader(users.admin.token))
        .send({ newTemporaryPassword: 'weak' });

      // Assert
      expect(response.status).toBe(400);
    });
  });
});
