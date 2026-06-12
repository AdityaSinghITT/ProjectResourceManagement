import { Department, Designation, ProficiencyLevel, ResourceStatus, SkillCategory } from '@prisma/client';
import { IAdminUserRepository } from '../../domain/interfaces/IAdminUserRepository';
import {
  IResourceProfileRepository,
  ResourceProfileRecord,
} from '../../domain/interfaces/IResourceProfileRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import {
  ActiveAllocationPreview,
  EmployeeListResult,
  EmployeeSkillView,
} from '../../domain/types/admin.types';
import { validateActiveReportingManager } from '../validators/activeManager.validator';
import { AppError } from '../../shared/errors/AppError';
import { AdminMessages } from '../../shared/constants/adminMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { RoleNames } from '../../shared/constants/roleNames';
import { todayDateOnly } from '../../shared/utils/date.utils';
import { applyManagerDeactivationEffects, ManagerDeactivationEffects } from './managerDeactivation.effects';

export interface UpdateEmployeeRequest {
  department?: Department;
  designation?: Designation;
}

export interface AddSkillRequest {
  skillName: string;
  category: SkillCategory;
  proficiency: ProficiencyLevel;
}

export interface AssignManagerRequest {
  employeeUserId: number;
  managerUserId: number;
}

export class EmployeeService {
  constructor(
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly userRepository: IUserRepository,
    private readonly adminUserRepository: IAdminUserRepository,
    private readonly projectRepository: IProjectRepository,
  ) {}

  async listEmployees(filters: {
    status?: ResourceStatus;
    department?: Department;
  }): Promise<EmployeeListResult> {
    return this.resourceProfileRepository.list({
      resourceStatus: filters.status,
      department: filters.department,
    });
  }

  async assignManager(
    input: AssignManagerRequest,
  ): Promise<{ message: string; employee: ResourceProfileRecord }> {
    const profile = await this.requireResourceProfileByUserId(input.employeeUserId);
    this.ensureProfileIsActive(profile, AdminMessages.CANNOT_ASSIGN_MANAGER_INACTIVE_EMPLOYEE);

    await validateActiveReportingManager(
      input.managerUserId,
      this.userRepository,
      this.resourceProfileRepository,
    );

    const updated = await this.resourceProfileRepository.assignManager({
      resourceUserId: input.employeeUserId,
      managerUserId: input.managerUserId,
    });

    return { message: AdminMessages.MANAGER_ASSIGNED, employee: updated };
  }

  async updateEmployee(
    resourceProfileId: number,
    input: UpdateEmployeeRequest,
  ): Promise<{ message: string; employee: ResourceProfileRecord }> {
    const profile = await this.requireResourceProfile(resourceProfileId);
    this.ensureProfileIsActive(profile, AdminMessages.CANNOT_MODIFY_INACTIVE_EMPLOYEE);

    const updated = await this.resourceProfileRepository.update({
      resourceProfileId,
      department: input.department,
      designation: input.designation,
    });

    return { message: AdminMessages.EMPLOYEE_UPDATED, employee: updated };
  }

  async getDeactivationPreview(resourceProfileId: number): Promise<{
    employee: ResourceProfileRecord;
    activeAllocations: ActiveAllocationPreview[];
  }> {
    const profile = await this.requireResourceProfile(resourceProfileId);
    const activeAllocations =
      await this.resourceProfileRepository.getActiveAllocations(resourceProfileId);

    return { employee: profile, activeAllocations };
  }

  async deactivateEmployee(resourceProfileId: number): Promise<{
    message: string;
    employee: ResourceProfileRecord;
    endedAllocations: number;
    managerEffects?: ManagerDeactivationEffects;
  }> {
    const profile = await this.requireResourceProfile(resourceProfileId);

    if (!profile.isActive) {
      throw new AppError(
        HttpStatus.CONFLICT,
        AdminMessages.EMPLOYEE_ALREADY_INACTIVE,
        ErrorTitles.CONFLICT,
      );
    }

    const user = await this.userRepository.findById(profile.userId);
    const activeAllocations =
      await this.resourceProfileRepository.getActiveAllocations(resourceProfileId);
    const endDate = todayDateOnly();

    let managerEffects: ManagerDeactivationEffects | undefined;

    if (user?.role === RoleNames.MANAGER) {
      managerEffects = await applyManagerDeactivationEffects(
        this.resourceProfileRepository,
        this.projectRepository,
        profile.userId,
      );
    }

    await this.resourceProfileRepository.endActiveAllocations(resourceProfileId, endDate);
    await this.adminUserRepository.setActiveStatus(profile.userId, false);

    const deactivated = await this.requireResourceProfile(resourceProfileId);

    return {
      message: AdminMessages.EMPLOYEE_DEACTIVATED,
      employee: deactivated,
      endedAllocations: activeAllocations.length,
      ...(managerEffects ? { managerEffects } : {}),
    };
  }

  async listSkills(resourceProfileId: number): Promise<EmployeeSkillView[]> {
    const profile = await this.requireResourceProfile(resourceProfileId);
    return this.resourceProfileRepository.listSkills(profile.userId);
  }

  async addSkill(
    resourceProfileId: number,
    input: AddSkillRequest,
  ): Promise<{ message: string; skill: EmployeeSkillView }> {
    const profile = await this.requireResourceProfile(resourceProfileId);
    this.ensureProfileIsActive(profile, AdminMessages.CANNOT_MODIFY_SKILLS_INACTIVE_EMPLOYEE);

    const skill = await this.resourceProfileRepository.addSkill({
      userId: profile.userId,
      skillName: input.skillName,
      category: input.category,
      proficiency: input.proficiency,
    });

    return { message: AdminMessages.SKILL_ADDED, skill };
  }

  async updateSkillProficiency(
    resourceProfileId: number,
    userSkillId: number,
    proficiency: ProficiencyLevel,
  ): Promise<{ message: string; skill: EmployeeSkillView }> {
    const profile = await this.requireResourceProfile(resourceProfileId);
    this.ensureProfileIsActive(profile, AdminMessages.CANNOT_MODIFY_SKILLS_INACTIVE_EMPLOYEE);
    await this.requireUserSkill(profile.userId, userSkillId);

    const skill = await this.resourceProfileRepository.updateSkill({ userSkillId, proficiency });
    return { message: AdminMessages.SKILL_UPDATED, skill };
  }

  async removeSkill(resourceProfileId: number, userSkillId: number): Promise<{ message: string }> {
    const profile = await this.requireResourceProfile(resourceProfileId);
    this.ensureProfileIsActive(profile, AdminMessages.CANNOT_MODIFY_SKILLS_INACTIVE_EMPLOYEE);
    await this.requireUserSkill(profile.userId, userSkillId);

    await this.resourceProfileRepository.removeSkill(userSkillId);
    return { message: AdminMessages.SKILL_REMOVED };
  }

  private ensureProfileIsActive(profile: ResourceProfileRecord, message: string): void {
    if (!profile.isActive) {
      throw new AppError(HttpStatus.CONFLICT, message, ErrorTitles.CONFLICT);
    }
  }

  private async requireResourceProfile(resourceProfileId: number): Promise<ResourceProfileRecord> {
    const profile = await this.resourceProfileRepository.findById(resourceProfileId);

    if (!profile) {
      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.EMPLOYEE_NOT_FOUND, ErrorTitles.NOT_FOUND);
    }

    return profile;
  }

  private async requireResourceProfileByUserId(userId: number): Promise<ResourceProfileRecord> {
    const profile = await this.resourceProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.EMPLOYEE_NOT_FOUND, ErrorTitles.NOT_FOUND);
    }

    return profile;
  }

  private async requireUserSkill(userId: number, userSkillId: number): Promise<EmployeeSkillView> {
    const skill = await this.resourceProfileRepository.findUserSkill(userSkillId);

    if (!skill) {
      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.SKILL_NOT_FOUND, ErrorTitles.NOT_FOUND);
    }

    const userSkills = await this.resourceProfileRepository.listSkills(userId);
    const belongsToUser = userSkills.some((item) => item.id === userSkillId);

    if (!belongsToUser) {
      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.SKILL_NOT_FOUND, ErrorTitles.NOT_FOUND);
    }

    return skill;
  }
}
