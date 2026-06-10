import bcrypt from 'bcrypt';

import { Role } from '@prisma/client';

import { IAdminUserRepository } from '../../domain/interfaces/IAdminUserRepository';

import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';

import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';

import { IUserRepository } from '../../domain/interfaces/IUserRepository';

import { AdminUserListResult, EmployeeListItem } from '../../domain/types/admin.types';

import { UserProfile } from '../../domain/types/user.types';

import { AuthConfig } from '../../shared/constants/authConfig';

import { AdminMessages } from '../../shared/constants/adminMessages';

import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';

import { requiresEmployeeProfile } from '../../shared/domain/roleRules';

import { AppError } from '../../shared/errors/AppError';

import { formatValidationViolations } from '../../shared/utils/validation.utils';

import { validatePasswordStrength } from '../validators/password.validator';

import { applyManagerDeactivationEffects, ManagerDeactivationEffects } from './managerDeactivation.effects';



export interface CreateUserRequest {

  username: string;

  email: string;

  fullName: string;

  temporaryPassword: string;

  role: Role;

  department?: string;

  designation?: string;

}



export class AdminUserService {

  constructor(

    private readonly adminUserRepository: IAdminUserRepository,

    private readonly userRepository: IUserRepository,

    private readonly employeeRepository: IEmployeeRepository,

    private readonly projectRepository: IProjectRepository,

  ) {}



  async createUser(

    input: CreateUserRequest,

  ): Promise<{ message: string; user: UserProfile; employee?: EmployeeListItem }> {

    await this.ensureUniqueCredentials(input.username, input.email);

    this.ensurePasswordMeetsPolicy(input.temporaryPassword);

    this.ensureEmployeeFieldsWhenRequired(input);



    const passwordHash = await bcrypt.hash(input.temporaryPassword, AuthConfig.BCRYPT_SALT_ROUNDS);



    const result = await this.adminUserRepository.createUser({

      username: input.username,

      email: input.email,

      fullName: input.fullName,

      passwordHash,

      role: input.role,

      department: input.department,

      designation: input.designation,

    });



    const message =

      result.employee !== undefined ? AdminMessages.EMPLOYEE_PROFILE_CREATED : AdminMessages.USER_CREATED;



    return { message, user: result.user, employee: result.employee };

  }



  async listUsers(): Promise<AdminUserListResult> {

    return this.adminUserRepository.listUsers();

  }



  async reactivateUser(userId: number): Promise<{ message: string; user: UserProfile }> {

    const user = await this.requireUser(userId);

    const reactivated = await this.adminUserRepository.setActiveStatus(userId, true);



    return {

      message: `${AdminMessages.USER_REACTIVATED} ${user.fullName} can now log in.`,

      user: reactivated,

    };

  }



  async deactivateUser(userId: number): Promise<{

    message: string;

    user: UserProfile;

    managerEffects?: ManagerDeactivationEffects;

  }> {

    const userRecord = await this.requireUserRecord(userId);



    if (!userRecord.isActive) {

      throw new AppError(HttpStatus.CONFLICT, AdminMessages.USER_ALREADY_INACTIVE, ErrorTitles.CONFLICT);

    }



    let managerEffects: ManagerDeactivationEffects | undefined;



    if (userRecord.role === Role.MANAGER) {

      managerEffects = await applyManagerDeactivationEffects(

        this.employeeRepository,

        this.projectRepository,

        userId,

      );

    }



    const deactivated = await this.adminUserRepository.setActiveStatus(userId, false);



    return {

      message: AdminMessages.USER_DEACTIVATED,

      user: deactivated,

      ...(managerEffects ? { managerEffects } : {}),

    };

  }



  async resetPassword(

    userId: number,

    newTemporaryPassword: string,

  ): Promise<{ message: string; user: UserProfile }> {

    await this.requireUser(userId);

    this.ensurePasswordMeetsPolicy(newTemporaryPassword);



    const passwordHash = await bcrypt.hash(newTemporaryPassword, AuthConfig.BCRYPT_SALT_ROUNDS);

    const user = await this.adminUserRepository.resetPassword(userId, passwordHash);



    return { message: AdminMessages.PASSWORD_RESET, user };

  }



  async resetPasswordByIdentifier(

    usernameOrUserId: string,

    newTemporaryPassword: string,

  ): Promise<{ message: string; user: UserProfile }> {

    const user = await this.resolveUser(usernameOrUserId);

    return this.resetPassword(user.id, newTemporaryPassword);

  }



  private async resolveUser(usernameOrUserId: string): Promise<UserProfile> {

    const trimmed = usernameOrUserId.trim();

    const numericId = Number(trimmed);



    if (!Number.isNaN(numericId) && Number.isInteger(numericId) && numericId > 0) {

      const user = await this.adminUserRepository.findUserProfileById(numericId);

      if (user) {

        return user;

      }

    }



    const user = await this.adminUserRepository.findUserProfileByUsername(trimmed);

    if (!user) {

      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.USER_NOT_FOUND, ErrorTitles.NOT_FOUND);

    }



    return user;

  }



  private async requireUser(userId: number): Promise<UserProfile> {

    const user = await this.adminUserRepository.findUserProfileById(userId);



    if (!user) {

      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.USER_NOT_FOUND, ErrorTitles.NOT_FOUND);

    }



    return user;

  }



  private async requireUserRecord(userId: number) {

    const user = await this.userRepository.findById(userId);



    if (!user) {

      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.USER_NOT_FOUND, ErrorTitles.NOT_FOUND);

    }



    return user;

  }



  private async ensureUniqueCredentials(username: string, email: string): Promise<void> {

    if (await this.adminUserRepository.existsByUsername(username)) {

      throw new AppError(HttpStatus.BAD_REQUEST, AdminMessages.USERNAME_EXISTS, ErrorTitles.BAD_REQUEST);

    }



    if (await this.adminUserRepository.existsByEmail(email)) {

      throw new AppError(HttpStatus.BAD_REQUEST, AdminMessages.EMAIL_EXISTS, ErrorTitles.BAD_REQUEST);

    }

  }



  private ensurePasswordMeetsPolicy(password: string): void {

    const violations = validatePasswordStrength(password);



    if (violations.length > 0) {

      throw new AppError(
        HttpStatus.BAD_REQUEST,
        formatValidationViolations(violations),
        ErrorTitles.BAD_REQUEST,
      );

    }

  }



  private ensureEmployeeFieldsWhenRequired(input: CreateUserRequest): void {

    if (!requiresEmployeeProfile(input.role)) {

      return;

    }



    if (!input.department?.trim() || !input.designation?.trim()) {

      throw new AppError(

        HttpStatus.BAD_REQUEST,

        AdminMessages.EMPLOYEE_FIELDS_REQUIRED,

        ErrorTitles.BAD_REQUEST,

      );

    }

  }

}


