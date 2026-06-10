import { EmployeeStatus, ProficiencyLevel, Role, SkillCategory } from '@prisma/client';

import { IAdminUserRepository } from '../../domain/interfaces/IAdminUserRepository';

import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';

import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';

import { IUserRepository } from '../../domain/interfaces/IUserRepository';

import { EmployeeRecord } from '../../domain/interfaces/IEmployeeRepository';

import {

  ActiveAllocationPreview,

  EmployeeListResult,

  EmployeeSkillView,

} from '../../domain/types/admin.types';

import { validateActiveReportingManager } from '../validators/activeManager.validator';
import { AppError } from '../../shared/errors/AppError';

import { AdminMessages } from '../../shared/constants/adminMessages';

import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';

import { todayDateOnly } from '../../shared/utils/date.utils';

import { applyManagerDeactivationEffects, ManagerDeactivationEffects } from './managerDeactivation.effects';



export interface UpdateEmployeeRequest {

  department?: string;

  designation?: string;

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

    private readonly employeeRepository: IEmployeeRepository,

    private readonly userRepository: IUserRepository,

    private readonly adminUserRepository: IAdminUserRepository,

    private readonly projectRepository: IProjectRepository,

  ) {}



  async listEmployees(filters: {

    status?: EmployeeStatus;

    department?: string;

  }): Promise<EmployeeListResult> {

    return this.employeeRepository.list(filters);

  }



  async assignManager(

    input: AssignManagerRequest,

  ): Promise<{ message: string; employee: EmployeeRecord }> {

    const employee = await this.requireEmployeeByUserId(input.employeeUserId);

    this.ensureEmployeeIsActive(employee, AdminMessages.CANNOT_ASSIGN_MANAGER_INACTIVE_EMPLOYEE);



    await validateActiveReportingManager(
      input.managerUserId,
      this.userRepository,
      this.employeeRepository,
    );



    const updated = await this.employeeRepository.assignManager({

      employeeUserId: input.employeeUserId,

      managerUserId: input.managerUserId,

    });



    return { message: AdminMessages.MANAGER_ASSIGNED, employee: updated };

  }



  async updateEmployee(

    employeeId: number,

    input: UpdateEmployeeRequest,

  ): Promise<{ message: string; employee: EmployeeRecord }> {

    const employee = await this.requireEmployee(employeeId);

    this.ensureEmployeeIsActive(employee, AdminMessages.CANNOT_MODIFY_INACTIVE_EMPLOYEE);



    const updated = await this.employeeRepository.update({

      employeeId,

      department: input.department,

      designation: input.designation,

    });



    return { message: AdminMessages.EMPLOYEE_UPDATED, employee: updated };

  }



  async getDeactivationPreview(employeeId: number): Promise<{

    employee: EmployeeRecord;

    activeAllocations: ActiveAllocationPreview[];

  }> {

    const employee = await this.requireEmployee(employeeId);

    const activeAllocations = await this.employeeRepository.getActiveAllocations(employeeId);



    return { employee, activeAllocations };

  }



  async deactivateEmployee(employeeId: number): Promise<{

    message: string;

    employee: EmployeeRecord;

    endedAllocations: number;

    managerEffects?: ManagerDeactivationEffects;

  }> {

    const employee = await this.requireEmployee(employeeId);



    if (!employee.isActive) {

      throw new AppError(

        HttpStatus.CONFLICT,

        AdminMessages.EMPLOYEE_ALREADY_INACTIVE,

        ErrorTitles.CONFLICT,

      );

    }



    const user = await this.userRepository.findById(employee.userId);

    const activeAllocations = await this.employeeRepository.getActiveAllocations(employeeId);

    const endDate = todayDateOnly();



    let managerEffects: ManagerDeactivationEffects | undefined;



    if (user?.role === Role.MANAGER) {

      managerEffects = await applyManagerDeactivationEffects(

        this.employeeRepository,

        this.projectRepository,

        employee.userId,

      );

    }



    await this.employeeRepository.endActiveAllocations(employeeId, endDate);

    await this.adminUserRepository.setActiveStatus(employee.userId, false);

    const deactivated = await this.employeeRepository.deactivate(employeeId);



    return {

      message: AdminMessages.EMPLOYEE_DEACTIVATED,

      employee: deactivated,

      endedAllocations: activeAllocations.length,

      ...(managerEffects ? { managerEffects } : {}),

    };

  }



  async listSkills(employeeId: number): Promise<EmployeeSkillView[]> {

    await this.requireEmployee(employeeId);

    return this.employeeRepository.listSkills(employeeId);

  }



  async addSkill(employeeId: number, input: AddSkillRequest): Promise<{ message: string; skill: EmployeeSkillView }> {

    const employee = await this.requireEmployee(employeeId);

    this.ensureEmployeeIsActive(employee, AdminMessages.CANNOT_MODIFY_SKILLS_INACTIVE_EMPLOYEE);



    const skill = await this.employeeRepository.addSkill({

      employeeId,

      skillName: input.skillName,

      category: input.category,

      proficiency: input.proficiency,

    });



    return { message: AdminMessages.SKILL_ADDED, skill };

  }



  async updateSkillProficiency(

    employeeId: number,

    employeeSkillId: number,

    proficiency: ProficiencyLevel,

  ): Promise<{ message: string; skill: EmployeeSkillView }> {

    const employee = await this.requireEmployee(employeeId);

    this.ensureEmployeeIsActive(employee, AdminMessages.CANNOT_MODIFY_SKILLS_INACTIVE_EMPLOYEE);

    await this.requireEmployeeSkill(employeeId, employeeSkillId);



    const skill = await this.employeeRepository.updateSkill({ employeeSkillId, proficiency });

    return { message: AdminMessages.SKILL_UPDATED, skill };

  }



  async removeSkill(employeeId: number, employeeSkillId: number): Promise<{ message: string }> {

    const employee = await this.requireEmployee(employeeId);

    this.ensureEmployeeIsActive(employee, AdminMessages.CANNOT_MODIFY_SKILLS_INACTIVE_EMPLOYEE);

    await this.requireEmployeeSkill(employeeId, employeeSkillId);



    await this.employeeRepository.removeSkill(employeeSkillId);

    return { message: AdminMessages.SKILL_REMOVED };

  }



  private ensureEmployeeIsActive(employee: EmployeeRecord, message: string): void {

    if (!employee.isActive) {

      throw new AppError(HttpStatus.CONFLICT, message, ErrorTitles.CONFLICT);

    }

  }



  private async requireEmployee(employeeId: number): Promise<EmployeeRecord> {

    const employee = await this.employeeRepository.findById(employeeId);



    if (!employee) {

      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.EMPLOYEE_NOT_FOUND, ErrorTitles.NOT_FOUND);

    }



    return employee;

  }



  private async requireEmployeeByUserId(userId: number): Promise<EmployeeRecord> {

    const employee = await this.employeeRepository.findByUserId(userId);



    if (!employee) {

      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.EMPLOYEE_NOT_FOUND, ErrorTitles.NOT_FOUND);

    }



    return employee;

  }



  private async requireEmployeeSkill(

    employeeId: number,

    employeeSkillId: number,

  ): Promise<EmployeeSkillView> {

    const skill = await this.employeeRepository.findEmployeeSkill(employeeSkillId);



    if (!skill) {

      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.SKILL_NOT_FOUND, ErrorTitles.NOT_FOUND);

    }



    const employeeSkills = await this.employeeRepository.listSkills(employeeId);

    const belongsToEmployee = employeeSkills.some((item) => item.id === employeeSkillId);



    if (!belongsToEmployee) {

      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.SKILL_NOT_FOUND, ErrorTitles.NOT_FOUND);

    }



    return skill;

  }

}


