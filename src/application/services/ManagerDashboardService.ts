import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { EmployeeDashboardDetail, ResourceDashboardResult } from '../../domain/types/allocation.types';
import { TimesheetService } from './TimesheetService';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { ManagerMessages } from '../../shared/constants/managerMessages';
import { AppError } from '../../shared/errors/AppError';
import { appLogger } from '../../shared/logger/appLogger';
import { todayDateOnly } from '../../shared/utils/date.utils';
import {
  calculateAvailabilityPercent,
  deriveDashboardStatus,
} from '../utils/allocationOverlap.util';

export class ManagerDashboardService {
  constructor(
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly timesheetService: TimesheetService,
  ) {}

  async getDashboard(managerUserId: number): Promise<ResourceDashboardResult> {
    appLogger.info('Fetching manager dashboard', { managerUserId });

    const teamMembers = await this.resourceProfileRepository.listTeamMembers(managerUserId);
    const today = todayDateOnly();
    const monthLabel = today.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    const summaries = await Promise.all(
      teamMembers.map(async (member) => {
        const utilizationPercent = await this.allocationRepository.getCurrentUtilizationPercent(
          member.id,
          today,
        );
        const skills = await this.resourceProfileRepository.listSkills(member.userId);
        const skillsSummary =
          skills.length > 0
            ? skills
                .slice(0, 3)
                .map((skill) => skill.skillName)
                .join(', ')
            : 'No skills listed';

        return {
          id: member.id,
          userId: member.userId,
          fullName: member.fullName,
          department: member.department,
          skillsSummary,
          utilizationPercent,
          availabilityPercent: calculateAvailabilityPercent(utilizationPercent),
          status: deriveDashboardStatus(utilizationPercent),
        };
      }),
    );

    const bench = summaries.filter((summary) => summary.status === 'BENCH');
    const active = summaries.filter((summary) => summary.status !== 'BENCH');

    return {
      monthLabel,
      bench,
      active,
      summary: {
        benchCount: bench.length,
        partialCount: summaries.filter((summary) => summary.status === 'PARTIAL').length,
        fullCount: summaries.filter((summary) => summary.status === 'FULL').length,
      },
    };
  }

  async getEmployeeDetail(
    managerUserId: number,
    resourceProfileId: number,
  ): Promise<EmployeeDashboardDetail> {
    appLogger.info('Fetching employee dashboard detail', { managerUserId, resourceProfileId });

    const teamMember = await this.resourceProfileRepository.findTeamMember(
      managerUserId,
      resourceProfileId,
    );

    if (!teamMember) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ManagerMessages.EMPLOYEE_DASHBOARD_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    const today = todayDateOnly();
    const utilizationPercent = await this.allocationRepository.getCurrentUtilizationPercent(
      teamMember.id,
      today,
    );
    const skills = await this.resourceProfileRepository.listSkills(teamMember.userId);
    const activeAllocations = await this.allocationRepository.listActiveViewsByResourceProfile(
      teamMember.id,
      today,
    );
    const recentActivityTags = await this.timesheetService.listRecentActivityLabels(teamMember.id);

    appLogger.debug('Loaded recent activity tags for employee dashboard', {
      resourceProfileId: teamMember.id,
      tagCount: recentActivityTags.length,
    });

    return {
      id: teamMember.id,
      fullName: teamMember.fullName,
      department: teamMember.department,
      designation: teamMember.designation,
      currentStatus: teamMember.resourceStatus,
      utilizationPercent,
      profileSkills: skills.map((skill) => skill.skillName),
      activeAllocations,
      recentActivityTags,
    };
  }
}
