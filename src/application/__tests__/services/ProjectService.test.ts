import { MilestoneStatus, ProjectStatus } from '@prisma/client';
import { IProjectRepository } from '../../../domain/interfaces/IProjectRepository';
import { IResourceProfileRepository } from '../../../domain/interfaces/IResourceProfileRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { AdminMessages } from '../../../shared/constants/adminMessages';
import { HttpStatus } from '../../../shared/constants/httpStatusCodes';
import { RoleNames } from '../../../shared/constants/roleNames';
import { ValidationMessages } from '../../../shared/constants/validationMessages';
import {
  buildActiveManagerProfile,
  buildCreateProjectRequest,
  buildMilestoneView,
  buildProjectListItem,
  buildUserRecord,
} from '../fixtures/adminTestBuilders';
import { ProjectService } from '../../services/ProjectService';

describe('ProjectService', () => {
  const projectRepository: jest.Mocked<IProjectRepository> = {
    create: jest.fn(),
    list: jest.fn(),
    listByManager: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    holdActiveProjectsByManager: jest.fn(),
    countManagedActiveProjects: jest.fn(),
    listMilestones: jest.fn(),
    createMilestone: jest.fn(),
    findMilestone: jest.fn(),
    updateMilestone: jest.fn(),
  };

  const userRepository: jest.Mocked<IUserRepository> = {
    findByUsername: jest.fn(),
    findById: jest.fn(),
    updatePassword: jest.fn(),
  };

  const resourceProfileRepository: jest.Mocked<IResourceProfileRepository> = {
    create: jest.fn(),
    assignManager: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    clearReportingManagerForTeam: jest.fn(),
    countTeamMembers: jest.fn(),
    getActiveAllocations: jest.fn(),
    endActiveAllocations: jest.fn(),
    listSkills: jest.fn(),
    addSkill: jest.fn(),
    updateSkill: jest.fn(),
    removeSkill: jest.fn(),
    findUserSkill: jest.fn(),
    updateResourceStatus: jest.fn(),
    findTeamMember: jest.fn(),
    listTeamMembers: jest.fn(),
    listOrganizationResources: jest.fn(),
    findResourceContact: jest.fn(),
    setTimesheetFrozen: jest.fn(),
    listActiveResources: jest.fn(),
  };

  const service = new ProjectService(projectRepository, userRepository, resourceProfileRepository);

  const managerUserId = 22;

  function mockActiveManager(userId = managerUserId): void {
    userRepository.findById.mockResolvedValue(
      buildUserRecord({ id: userId, role: RoleNames.MANAGER, isActive: true }),
    );
    resourceProfileRepository.findByUserId.mockResolvedValue(buildActiveManagerProfile(userId));
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('creates a project when manager and dates are valid', async () => {
      // Arrange
      mockActiveManager();
      const input = buildCreateProjectRequest({ managerId: managerUserId });
      const created = buildProjectListItem({ name: input.name, managerId: managerUserId });
      projectRepository.create.mockResolvedValue(created);

      // Act
      const result = await service.createProject(input);

      // Assert
      expect(result.message).toBe(AdminMessages.PROJECT_CREATED);
      expect(result.project).toEqual(created);
      expect(projectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: input.name,
          managerId: managerUserId,
          status: ProjectStatus.PLANNED,
        }),
      );
    });

    it('throws BAD_REQUEST when manager is not a manager role', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(
        buildUserRecord({ id: 5, role: RoleNames.RESOURCE, isActive: true }),
      );

      // Act & Assert
      await expect(service.createProject(buildCreateProjectRequest({ managerId: 5 }))).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: AdminMessages.INVALID_MANAGER,
      });
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST when manager account is inactive', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(
        buildUserRecord({ id: managerUserId, role: RoleNames.MANAGER, isActive: false }),
      );

      // Act & Assert
      await expect(
        service.createProject(buildCreateProjectRequest({ managerId: managerUserId })),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: AdminMessages.INACTIVE_MANAGER_CANNOT_BE_ASSIGNED,
      });
    });

    it('throws BAD_REQUEST when start date is not before end date', async () => {
      // Arrange
      mockActiveManager();

      // Act & Assert
      await expect(
        service.createProject(
          buildCreateProjectRequest({
            startDate: '2026-12-31',
            endDate: '2026-01-01',
          }),
        ),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ValidationMessages.START_DATE_BEFORE_END_DATE,
      });
    });

    it('throws BAD_REQUEST when date format is invalid', async () => {
      // Arrange
      mockActiveManager();

      // Act & Assert
      await expect(
        service.createProject(buildCreateProjectRequest({ startDate: '31-06-2026' })),
      ).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ValidationMessages.INVALID_DATE_FORMAT,
      });
    });
  });

  describe('updateProject', () => {
    it('updates an existing project', async () => {
      // Arrange
      const existing = buildProjectListItem({ id: 55, managerId: managerUserId });
      const updated = buildProjectListItem({ id: 55, name: 'Renamed Project' });
      projectRepository.findById.mockResolvedValue(existing);
      mockActiveManager();
      projectRepository.update.mockResolvedValue(updated);

      // Act
      const result = await service.updateProject(55, { name: 'Renamed Project' });

      // Assert
      expect(result.message).toBe(AdminMessages.PROJECT_UPDATED);
      expect(result.project).toEqual(updated);
      expect(projectRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 55, name: 'Renamed Project' }),
      );
    });

    it('throws NOT_FOUND when project does not exist', async () => {
      // Arrange
      projectRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateProject(999, { name: 'Missing' })).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: AdminMessages.PROJECT_NOT_FOUND,
      });
    });

    it('re-validates manager when status changes to ACTIVE', async () => {
      // Arrange
      const existing = buildProjectListItem({
        id: 60,
        managerId: managerUserId,
        status: ProjectStatus.PLANNED,
      });
      projectRepository.findById.mockResolvedValue(existing);
      mockActiveManager();
      projectRepository.update.mockResolvedValue({ ...existing, status: ProjectStatus.ACTIVE });

      // Act
      await service.updateProject(60, { status: ProjectStatus.ACTIVE });

      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith(managerUserId);
      expect(projectRepository.update).toHaveBeenCalled();
    });
  });

  describe('listMilestones', () => {
    it('returns milestones for an existing project', async () => {
      // Arrange
      const project = buildProjectListItem({ id: 70 });
      const milestones = {
        milestones: [buildMilestoneView({ projectId: 70 })],
        summary: { totalStoryPoints: 20, completedStoryPoints: 0, remainingStoryPoints: 20 },
      };
      projectRepository.findById.mockResolvedValue(project);
      projectRepository.listMilestones.mockResolvedValue(milestones);

      // Act
      const result = await service.listMilestones(70);

      // Assert
      expect(result).toEqual(milestones);
      expect(projectRepository.listMilestones).toHaveBeenCalledWith(70);
    });

    it('throws NOT_FOUND when project does not exist', async () => {
      // Arrange
      projectRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.listMilestones(404)).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: AdminMessages.PROJECT_NOT_FOUND,
      });
    });
  });

  describe('createMilestone', () => {
    it('creates a milestone for an existing project', async () => {
      // Arrange
      projectRepository.findById.mockResolvedValue(buildProjectListItem({ id: 80 }));
      const milestone = buildMilestoneView({ projectId: 80, title: 'Go Live' });
      projectRepository.createMilestone.mockResolvedValue(milestone);

      // Act
      const result = await service.createMilestone(80, {
        title: 'Go Live',
        dueDate: '2026-10-01',
        status: MilestoneStatus.NOT_STARTED,
        storyPoints: 15,
      });

      // Assert
      expect(result.message).toBe(AdminMessages.MILESTONE_CREATED);
      expect(result.milestone).toEqual(milestone);
      expect(projectRepository.createMilestone).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 80, title: 'Go Live', storyPoints: 15 }),
      );
    });
  });

  describe('updateMilestone', () => {
    it('throws NOT_FOUND when milestone does not exist', async () => {
      // Arrange
      projectRepository.findById.mockResolvedValue(buildProjectListItem({ id: 90 }));
      projectRepository.findMilestone.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateMilestone(90, 5, { title: 'Updated' })).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: AdminMessages.MILESTONE_NOT_FOUND,
      });
    });
  });
});
