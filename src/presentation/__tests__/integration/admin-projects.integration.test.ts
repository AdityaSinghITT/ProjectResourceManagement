import { MilestoneStatus, ProjectStatus } from '@prisma/client';
import request from 'supertest';
import { AdminMessages } from '../../../shared/constants/adminMessages';
import { ValidationMessages } from '../../../shared/constants/validationMessages';
import {
  app,
  authHeader,
  getIntegrationContext,
  IntegrationTestContext,
  integrationPaths,
  teardownIntegrationSuite,
} from './helpers';

jest.setTimeout(120000);

describe('Admin Project API integration', () => {
  let users: IntegrationTestContext;
  let createdProjectId = 0;
  let createdMilestoneId = 0;

  beforeAll(async () => {
    users = await getIntegrationContext();
  });

  afterAll(async () => {
    await teardownIntegrationSuite();
  });

  describe('POST /api/admin/projects — Create Project', () => {
    it('creates a project with valid payload', async () => {
      // Arrange
      const payload = {
        name: `Integration Project ${Date.now()}`,
        description: 'Created by admin-projects integration test',
        startDate: '2026-06-01',
        endDate: '2026-12-31',
        status: ProjectStatus.PLANNED,
        managerId: users.manager.userId,
        totalStoryPoints: 80,
      };

      // Act
      const response = await request(app)
        .post(integrationPaths.adminProjects)
        .set(authHeader(users.admin.token))
        .send(payload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.PROJECT_CREATED);
      expect(response.body.project).toMatchObject({
        name: payload.name,
        managerId: users.manager.userId,
        status: ProjectStatus.PLANNED,
        totalStoryPoints: 80,
      });
      createdProjectId = response.body.project.id;
    });

    it('returns 400 when start date is after end date', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminProjects)
        .set(authHeader(users.admin.token))
        .send({
          name: 'Invalid Dates Project',
          description: 'Invalid date range',
          startDate: '2026-12-31',
          endDate: '2026-01-01',
          status: ProjectStatus.PLANNED,
          managerId: users.manager.userId,
          totalStoryPoints: 10,
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(ValidationMessages.START_DATE_BEFORE_END_DATE);
    });

    it('returns 400 when manager id is not a manager', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminProjects)
        .set(authHeader(users.admin.token))
        .send({
          name: 'Invalid Manager Project',
          description: 'Resource cannot be project manager',
          startDate: '2026-06-01',
          endDate: '2026-12-31',
          status: ProjectStatus.PLANNED,
          managerId: users.resource.userId,
          totalStoryPoints: 10,
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(AdminMessages.INVALID_MANAGER);
    });

    it('returns 400 when required fields are missing', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminProjects)
        .set(authHeader(users.admin.token))
        .send({ name: 'Incomplete Project' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('returns 403 when manager attempts to create a project', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminProjects)
        .set(authHeader(users.manager.token))
        .send({
          name: 'Forbidden Project',
          description: 'Manager cannot create via admin API',
          startDate: '2026-06-01',
          endDate: '2026-12-31',
          status: ProjectStatus.PLANNED,
          managerId: users.manager.userId,
          totalStoryPoints: 10,
        });

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/admin/projects — List Projects', () => {
    it('returns projects including the created project', async () => {
      // Act
      const response = await request(app)
        .get(integrationPaths.adminProjects)
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.projects)).toBe(true);
      const created = response.body.projects.find(
        (project: { id: number }) => project.id === createdProjectId,
      );
      expect(created).toBeDefined();
    });
  });

  describe('PATCH /api/admin/projects/:id — Update Project', () => {
    it('updates project fields', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminProjectById(createdProjectId))
        .set(authHeader(users.admin.token))
        .send({
          name: 'Updated Integration Project',
          status: ProjectStatus.ACTIVE,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.PROJECT_UPDATED);
      expect(response.body.project).toMatchObject({
        id: createdProjectId,
        name: 'Updated Integration Project',
        status: ProjectStatus.ACTIVE,
      });
    });

    it('returns 404 when project does not exist', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminProjectById(9_999_999))
        .set(authHeader(users.admin.token))
        .send({ name: 'Missing Project' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toBe(AdminMessages.PROJECT_NOT_FOUND);
    });
  });

  describe('Project milestones', () => {
    it('creates a milestone for an existing project', async () => {
      // Act
      const response = await request(app)
        .post(integrationPaths.adminProjectMilestones(createdProjectId))
        .set(authHeader(users.admin.token))
        .send({
          title: 'Integration Milestone',
          dueDate: '2026-09-15',
          status: MilestoneStatus.NOT_STARTED,
          storyPoints: 12,
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.MILESTONE_CREATED);
      expect(response.body.milestone).toMatchObject({
        projectId: createdProjectId,
        title: 'Integration Milestone',
        storyPoints: 12,
      });
      createdMilestoneId = response.body.milestone.id;
    });

    it('lists milestones for the project', async () => {
      // Act
      const response = await request(app)
        .get(integrationPaths.adminProjectMilestones(createdProjectId))
        .set(authHeader(users.admin.token));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.milestones.length).toBeGreaterThan(0);
      expect(response.body.summary.totalStoryPoints).toBeGreaterThanOrEqual(12);
    });

    it('updates an existing milestone', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminProjectMilestoneById(createdProjectId, createdMilestoneId))
        .set(authHeader(users.admin.token))
        .send({ status: MilestoneStatus.IN_PROGRESS });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(AdminMessages.MILESTONE_UPDATED);
      expect(response.body.milestone.status).toBe(MilestoneStatus.IN_PROGRESS);
    });

    it('returns 404 when milestone does not exist', async () => {
      // Act
      const response = await request(app)
        .patch(integrationPaths.adminProjectMilestoneById(createdProjectId, 9_999_999))
        .set(authHeader(users.admin.token))
        .send({ title: 'Missing Milestone' });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.message).toBe(AdminMessages.MILESTONE_NOT_FOUND);
    });
  });
});
