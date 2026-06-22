import { Department, Designation } from '@prisma/client';
import { IAdminUserRepository } from '../../../domain/interfaces/IAdminUserRepository';
import { IProjectRepository } from '../../../domain/interfaces/IProjectRepository';
import { IResourceProfileRepository } from '../../../domain/interfaces/IResourceProfileRepository';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { AdminMessages } from '../../../shared/constants/adminMessages';
import { HttpStatus } from '../../../shared/constants/httpStatusCodes';
import { RoleNames } from '../../../shared/constants/roleNames';
import { AppError } from '../../../shared/errors/AppError';
import {
  buildCreateUserRequest,
  buildEmployeeListItem,
  buildUserProfile,
  buildUserRecord,
} from '../fixtures/adminTestBuilders';
import { AdminUserService } from '../../services/AdminUserService';
import { applyManagerDeactivationEffects } from '../../services/managerDeactivation.effects';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

jest.mock('../../services/managerDeactivation.effects', () => ({
  applyManagerDeactivationEffects: jest.fn(),
}));

describe('AdminUserService', () => {
  const adminUserRepository: jest.Mocked<IAdminUserRepository> = {
    createUser: jest.fn(),
    listUsers: jest.fn(),
    findUserProfileById: jest.fn(),
    findUserProfileByUsername: jest.fn(),
    existsByUsername: jest.fn(),
    existsByEmail: jest.fn(),
    setActiveStatus: jest.fn(),
    resetPassword: jest.fn(),
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

  const service = new AdminUserService(
    adminUserRepository,
    userRepository,
    resourceProfileRepository,
    projectRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    adminUserRepository.existsByUsername.mockResolvedValue(false);
    adminUserRepository.existsByEmail.mockResolvedValue(false);
  });

  describe('createUser', () => {
    it('creates an admin user and returns success message with profile', async () => {
      // Arrange
      const input = buildCreateUserRequest({ role: RoleNames.ADMIN });
      const createdUser = buildUserProfile({
        username: input.username,
        email: input.email,
        fullName: input.fullName,
        role: RoleNames.ADMIN,
      });
      adminUserRepository.createUser.mockResolvedValue({ user: createdUser });

      // Act
      const result = await service.createUser(input);

      // Assert
      expect(result.message).toBe(AdminMessages.USER_CREATED);
      expect(result.user).toEqual(createdUser);
      expect(result.employee).toBeUndefined();
      expect(adminUserRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: input.username,
          email: input.email,
          passwordHash: 'hashed-password',
          role: RoleNames.ADMIN,
        }),
      );
    });

    it('creates a resource user with employee profile when department and designation are provided', async () => {
      // Arrange
      const input = buildCreateUserRequest({
        role: RoleNames.RESOURCE,
        department: Department.ENGINEERING,
        designation: Designation.SOFTWARE_ENGINEER,
      });
      const createdUser = buildUserProfile({ role: RoleNames.RESOURCE, username: input.username });
      const employee = buildEmployeeListItem({ userId: createdUser.id });
      adminUserRepository.createUser.mockResolvedValue({ user: createdUser, employee });

      // Act
      const result = await service.createUser(input);

      // Assert
      expect(result.message).toBe(AdminMessages.EMPLOYEE_PROFILE_CREATED);
      expect(result.employee).toEqual(employee);
      expect(adminUserRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          department: Department.ENGINEERING,
          designation: Designation.SOFTWARE_ENGINEER,
        }),
      );
    });

    it('throws BAD_REQUEST when username already exists', async () => {
      // Arrange
      adminUserRepository.existsByUsername.mockResolvedValue(true);
      const input = buildCreateUserRequest();

      // Act & Assert
      await expect(service.createUser(input)).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: AdminMessages.USERNAME_EXISTS,
      });
      expect(adminUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST when email already exists', async () => {
      // Arrange
      adminUserRepository.existsByEmail.mockResolvedValue(true);
      const input = buildCreateUserRequest();

      // Act & Assert
      await expect(service.createUser(input)).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: AdminMessages.EMAIL_EXISTS,
      });
    });

    it('throws BAD_REQUEST when password does not meet policy', async () => {
      // Arrange
      const input = buildCreateUserRequest({ temporaryPassword: 'weak' });

      // Act & Assert
      await expect(service.createUser(input)).rejects.toBeInstanceOf(AppError);
      await expect(service.createUser(input)).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
      });
      expect(adminUserRepository.createUser).not.toHaveBeenCalled();
    });

    it('throws BAD_REQUEST when resource role is missing employee fields', async () => {
      // Arrange
      const input = buildCreateUserRequest({ role: RoleNames.RESOURCE });

      // Act & Assert
      await expect(service.createUser(input)).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
        message: AdminMessages.EMPLOYEE_FIELDS_REQUIRED,
      });
    });
  });

  describe('listUsers', () => {
    it('returns users from repository', async () => {
      // Arrange
      const listResult = {
        users: [
          {
            id: 1,
            username: 'test.user',
            fullName: 'Test User',
            role: RoleNames.ADMIN,
            isActive: true,
          },
        ],
        summary: { total: 1, active: 1, inactive: 0 },
      };
      adminUserRepository.listUsers.mockResolvedValue(listResult);

      // Act
      const result = await service.listUsers();

      // Assert
      expect(result).toEqual(listResult);
      expect(adminUserRepository.listUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('reactivateUser', () => {
    it('reactivates an inactive user', async () => {
      // Arrange
      const user = buildUserProfile({ id: 9, fullName: 'Inactive User' });
      const reactivated = buildUserProfile({ ...user, forcePasswordChange: false });
      adminUserRepository.findUserProfileById.mockResolvedValue(user);
      adminUserRepository.setActiveStatus.mockResolvedValue(reactivated);

      // Act
      const result = await service.reactivateUser(9);

      // Assert
      expect(result.user).toEqual(reactivated);
      expect(result.message).toContain(AdminMessages.USER_REACTIVATED);
      expect(adminUserRepository.setActiveStatus).toHaveBeenCalledWith(9, true);
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      // Arrange
      adminUserRepository.findUserProfileById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.reactivateUser(999)).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: AdminMessages.USER_NOT_FOUND,
      });
    });
  });

  describe('deactivateUser', () => {
    it('deactivates an active user', async () => {
      // Arrange
      const userRecord = buildUserRecord({ id: 4, role: RoleNames.ADMIN });
      const deactivated = buildUserProfile({ id: 4, forcePasswordChange: true });
      userRepository.findById.mockResolvedValue(userRecord);
      adminUserRepository.setActiveStatus.mockResolvedValue(deactivated);

      // Act
      const result = await service.deactivateUser(4);

      // Assert
      expect(result.message).toBe(AdminMessages.USER_DEACTIVATED);
      expect(result.user).toEqual(deactivated);
      expect(applyManagerDeactivationEffects).not.toHaveBeenCalled();
      expect(adminUserRepository.setActiveStatus).toHaveBeenCalledWith(4, false);
    });

    it('applies manager deactivation side effects before deactivating a manager', async () => {
      // Arrange
      const userRecord = buildUserRecord({ id: 7, role: RoleNames.MANAGER });
      const deactivated = buildUserProfile({ id: 7, role: RoleNames.MANAGER });
      userRepository.findById.mockResolvedValue(userRecord);
      adminUserRepository.setActiveStatus.mockResolvedValue(deactivated);
      (applyManagerDeactivationEffects as jest.Mock).mockResolvedValue({
        clearedTeamMembers: 2,
        projectsPutOnHold: 1,
      });

      // Act
      const result = await service.deactivateUser(7);

      // Assert
      expect(applyManagerDeactivationEffects).toHaveBeenCalledWith(
        resourceProfileRepository,
        projectRepository,
        7,
      );
      expect(result.managerEffects).toEqual({ clearedTeamMembers: 2, projectsPutOnHold: 1 });
    });

    it('throws CONFLICT when user is already inactive', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(buildUserRecord({ id: 3, isActive: false }));

      // Act & Assert
      await expect(service.deactivateUser(3)).rejects.toMatchObject({
        statusCode: HttpStatus.CONFLICT,
        message: AdminMessages.USER_ALREADY_INACTIVE,
      });
      expect(adminUserRepository.setActiveStatus).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when user record does not exist', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deactivateUser(404)).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: AdminMessages.USER_NOT_FOUND,
      });
    });
  });

  describe('resetPassword', () => {
    it('resets password for an existing user', async () => {
      // Arrange
      const user = buildUserProfile({ id: 12 });
      const updated = buildUserProfile({ ...user, forcePasswordChange: true });
      adminUserRepository.findUserProfileById.mockResolvedValue(user);
      adminUserRepository.resetPassword.mockResolvedValue(updated);

      // Act
      const result = await service.resetPassword(12, 'NewPass123');

      // Assert
      expect(result.message).toBe(AdminMessages.PASSWORD_RESET);
      expect(result.user).toEqual(updated);
      expect(adminUserRepository.resetPassword).toHaveBeenCalledWith(12, 'hashed-password');
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      // Arrange
      adminUserRepository.findUserProfileById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(55, 'NewPass123')).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: AdminMessages.USER_NOT_FOUND,
      });
    });

    it('throws BAD_REQUEST when new password is weak', async () => {
      // Arrange
      adminUserRepository.findUserProfileById.mockResolvedValue(buildUserProfile({ id: 12 }));

      // Act & Assert
      await expect(service.resetPassword(12, 'short')).rejects.toMatchObject({
        statusCode: HttpStatus.BAD_REQUEST,
      });
      expect(adminUserRepository.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('resetPasswordByIdentifier', () => {
    it('resolves user by numeric id and resets password', async () => {
      // Arrange
      const user = buildUserProfile({ id: 18, username: 'lookup.user' });
      const updated = buildUserProfile({ ...user, forcePasswordChange: true });
      adminUserRepository.findUserProfileById.mockResolvedValue(user);
      adminUserRepository.resetPassword.mockResolvedValue(updated);

      // Act
      const result = await service.resetPasswordByIdentifier('18', 'ResetPass1');

      // Assert
      expect(result.message).toBe(AdminMessages.PASSWORD_RESET);
      expect(adminUserRepository.findUserProfileById).toHaveBeenCalledWith(18);
    });

    it('resolves user by username when id lookup fails', async () => {
      // Arrange
      const user = buildUserProfile({ id: 21, username: 'lookup.user' });
      adminUserRepository.findUserProfileByUsername.mockResolvedValue(user);
      adminUserRepository.findUserProfileById.mockResolvedValue(user);
      adminUserRepository.resetPassword.mockResolvedValue(user);

      // Act
      await service.resetPasswordByIdentifier('lookup.user', 'ResetPass1');

      // Assert
      expect(adminUserRepository.findUserProfileByUsername).toHaveBeenCalledWith('lookup.user');
      expect(adminUserRepository.resetPassword).toHaveBeenCalledWith(21, 'hashed-password');
    });

    it('throws NOT_FOUND when identifier does not match any user', async () => {
      // Arrange
      adminUserRepository.findUserProfileById.mockResolvedValue(null);
      adminUserRepository.findUserProfileByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPasswordByIdentifier('missing', 'ResetPass1')).rejects.toMatchObject({
        statusCode: HttpStatus.NOT_FOUND,
        message: AdminMessages.USER_NOT_FOUND,
      });
    });
  });
});
