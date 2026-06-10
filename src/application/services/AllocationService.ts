import { ProjectStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import {
  AllocationListResult,
  AllocationValidationResult,
  AllocationView,
} from '../../domain/types/allocation.types';
import { AllocationRules } from '../../shared/constants/allocationRules';
import { ManagerMessages } from '../../shared/constants/managerMessages';
import { ProjectRules } from '../../shared/constants/projectRules';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { ValidationMessages } from '../../shared/constants/validationMessages';
import { AppError } from '../../shared/errors/AppError';
import { appLogger } from '../../shared/logger/appLogger';
import { formatDateOnly, parseIsoDate, todayDateOnly } from '../../shared/utils/date.utils';
import {
  calculateTotalUtilization,
  isUtilizationValid,
  sumOverlappingUtilization,
} from '../utils/allocationOverlap.util';
import { EmployeeStatusService } from './EmployeeStatusService';

export interface AllocationRequest {
  employeeId: number;
  projectId: number;
  utilizationPercent: number;
  fromDate: string;
  toDate: string;
}

export class AllocationService {
  constructor(
    private readonly allocationRepository: IAllocationRepository,
    private readonly employeeRepository: IEmployeeRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly employeeStatusService: EmployeeStatusService,
  ) {}

  async listAdminAllocations(filters: {
    employeeId?: number;
    projectId?: number;
  }): Promise<AllocationListResult> {
    appLogger.info('Listing admin allocations', { filters });
    return this.allocationRepository.listAdmin(filters);
  }

  async validateAllocation(
    managerUserId: number,
    request: AllocationRequest,
  ): Promise<AllocationValidationResult> {
    appLogger.debug('Validating allocation', { managerUserId, request });
    return this.evaluateAllocation(managerUserId, request);
  }

  async createAllocation(
    managerUserId: number,
    request: AllocationRequest,
  ): Promise<{ message: string; allocation: AllocationView }> {
    const validation = await this.evaluateAllocation(managerUserId, request);

    if (!validation.valid) {
      throw new AppError(HttpStatus.BAD_REQUEST, validation.message, ErrorTitles.BAD_REQUEST);
    }

    const allocation = await this.allocationRepository.create({
      employeeId: request.employeeId,
      projectId: request.projectId,
      utilizationPercent: request.utilizationPercent,
      fromDate: parseIsoDate(request.fromDate),
      toDate: parseIsoDate(request.toDate),
    });

    await this.employeeStatusService.recomputeStatus(request.employeeId, todayDateOnly());

    appLogger.info('Allocation created', {
      managerUserId,
      allocationId: allocation.id,
      employeeId: request.employeeId,
      projectId: request.projectId,
    });

    return { message: ManagerMessages.ALLOCATION_CREATED, allocation };
  }

  async endAllocation(
    managerUserId: number,
    allocationId: number,
  ): Promise<{ message: string; allocation: AllocationView }> {
    const allocation = await this.allocationRepository.findById(allocationId);

    if (!allocation) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ManagerMessages.ALLOCATION_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    if (allocation.managerId !== managerUserId) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ManagerMessages.PROJECT_NOT_OWNED,
        ErrorTitles.FORBIDDEN,
      );
    }

    const today = todayDateOnly();
    const fromDate = parseIsoDate(allocation.fromDate);
    const toDate = parseIsoDate(allocation.toDate);

    if (toDate < today) {
      throw new AppError(
        HttpStatus.CONFLICT,
        ManagerMessages.ALLOCATION_ALREADY_ENDED,
        ErrorTitles.CONFLICT,
      );
    }

    if (fromDate > today) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ManagerMessages.ALLOCATION_NOT_STARTED,
        ErrorTitles.BAD_REQUEST,
      );
    }

    const ended = await this.allocationRepository.endAllocation(allocationId, today);
    await this.employeeStatusService.recomputeStatus(allocation.employeeId, today);

    appLogger.info('Allocation ended', {
      managerUserId,
      allocationId,
      employeeId: allocation.employeeId,
      endDate: formatDateOnly(today),
    });

    return { message: ManagerMessages.ALLOCATION_ENDED, allocation: ended };
  }

  private async evaluateAllocation(
    managerUserId: number,
    request: AllocationRequest,
  ): Promise<AllocationValidationResult> {
    this.ensureUtilizationInRange(request.utilizationPercent);

    const fromDate = parseIsoDate(request.fromDate);
    const toDate = parseIsoDate(request.toDate);

    if (fromDate >= toDate) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ValidationMessages.START_DATE_BEFORE_END_DATE,
        ErrorTitles.BAD_REQUEST,
      );
    }

    const teamMember = await this.employeeRepository.findTeamMember(
      managerUserId,
      request.employeeId,
    );

    if (!teamMember) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ManagerMessages.EMPLOYEE_NOT_IN_TEAM,
        ErrorTitles.FORBIDDEN,
      );
    }

    const project = await this.projectRepository.findById(request.projectId);

    if (!project) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ManagerMessages.PROJECT_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    if (project.managerId !== managerUserId) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ManagerMessages.PROJECT_NOT_OWNED,
        ErrorTitles.FORBIDDEN,
      );
    }

    if (!this.isProjectAllocatable(project.status)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ManagerMessages.PROJECT_NOT_ALLOCATABLE,
        ErrorTitles.BAD_REQUEST,
      );
    }

    const overlapping = await this.allocationRepository.listOverlappingForEmployee(
      request.employeeId,
      fromDate,
      toDate,
    );

    const currentUtilizationPercent = sumOverlappingUtilization(
      overlapping,
      fromDate,
      toDate,
    );
    const totalUtilizationPercent = calculateTotalUtilization(
      currentUtilizationPercent,
      request.utilizationPercent,
    );
    const valid = isUtilizationValid(totalUtilizationPercent);

    const message = valid
      ? ManagerMessages.ALLOCATION_VALID_DETAIL(
          currentUtilizationPercent,
          request.utilizationPercent,
          totalUtilizationPercent,
        )
      : ManagerMessages.UTILIZATION_EXCEEDED(
          teamMember.fullName,
          currentUtilizationPercent,
          request.utilizationPercent,
          totalUtilizationPercent,
        );

    return {
      valid,
      message,
      currentUtilizationPercent,
      newUtilizationPercent: request.utilizationPercent,
      totalUtilizationPercent,
      employeeName: teamMember.fullName,
    };
  }

  private ensureUtilizationInRange(utilizationPercent: number): void {
    if (
      utilizationPercent < AllocationRules.MIN_UTILIZATION_PERCENT ||
      utilizationPercent > AllocationRules.MAX_UTILIZATION_PERCENT
    ) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        `Utilization must be between ${AllocationRules.MIN_UTILIZATION_PERCENT} and ${AllocationRules.MAX_UTILIZATION_PERCENT}`,
        ErrorTitles.BAD_REQUEST,
      );
    }
  }

  private isProjectAllocatable(status: ProjectStatus): boolean {
    return ProjectRules.STATUSES_REQUIRING_ACTIVE_MANAGER.includes(
      status as (typeof ProjectRules.STATUSES_REQUIRING_ACTIVE_MANAGER)[number],
    );
  }
}
