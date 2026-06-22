import { TimesheetStatus } from '@prisma/client';
import { TimesheetComplianceService } from '../services/TimesheetComplianceService';
import { IActivityTagRepository } from '../../domain/interfaces/IActivityTagRepository';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { ISystemConfigRepository } from '../../domain/interfaces/ISystemConfigRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import {
  ActivityTagView,
  EmployeeAllocationsResult,
  ManagerTeamTimesheetResult,
  SubmitTimesheetEntryInput,
  TimesheetHistoryResult,
  TimesheetReminderResult,
  TimesheetWeekView,
} from '../../domain/types/timesheet.types';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { TimesheetMessages } from '../../shared/constants/timesheetMessages';
import { TimesheetRules } from '../../shared/constants/timesheetRules';
import { AppError } from '../../shared/errors/AppError';
import { appLogger } from '../../shared/logger/appLogger';
import { formatDateOnly, todayDateOnly } from '../../shared/utils/date.utils';
import {
  addDays,
  getWeekEnd,
  getWeekStart,
  isFutureWeek,
  parseWeekStart,
} from '../utils/week.utils';

interface ProjectAllocationCap {
  projectId: number;
  projectName: string;
  utilizationPercent: number;
  maxHoursForWeek: number;
  fromDate: string;
  toDate: string;
}

export class TimesheetService {
  constructor(
    private readonly timesheetRepository: ITimesheetRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly systemConfigRepository: ISystemConfigRepository,
    private readonly activityTagRepository: IActivityTagRepository,
    private readonly complianceService?: TimesheetComplianceService,
  ) {}

  async listActivityTags(): Promise<ActivityTagView[]> {
    appLogger.debug('Listing activity tags');
    return this.activityTagRepository.listAll();
  }

  async getEmployeeAllocations(
    userId: number,
    weekStartInput?: string,
  ): Promise<EmployeeAllocationsResult> {
    const profile = await this.requireResourceProfileByUserId(userId);
    const weekStart = this.resolveWeekStart(weekStartInput);
    const weekEnd = getWeekEnd(weekStart);
    const maxWeeklyHours = await this.getMaxWeeklyHours();
    const allocations = await this.buildProjectAllocationCaps(
      profile.id,
      weekStart,
      weekEnd,
      maxWeeklyHours,
    );

    appLogger.info('Fetched employee allocations for timesheet week', {
      resourceProfileId: profile.id,
      weekStart: formatDateOnly(weekStart),
      allocationCount: allocations.length,
    });

    return {
      weekStart: formatDateOnly(weekStart),
      weekEnd: formatDateOnly(weekEnd),
      allocations,
    };
  }

  async listHistory(userId: number): Promise<TimesheetHistoryResult> {
    const profile = await this.requireResourceProfileByUserId(userId);
    appLogger.info('Listing employee timesheet history', { resourceProfileId: profile.id });
    return this.timesheetRepository.listHistoryByResourceProfile(profile.id);
  }

  async getWeekDetail(userId: number, weekStartInput: string): Promise<TimesheetWeekView> {
    const profile = await this.requireResourceProfileByUserId(userId);
    const weekStart = this.resolveWeekStart(weekStartInput);
    const timesheet = await this.timesheetRepository.findByResourceProfileAndWeek(
      profile.id,
      weekStart,
    );

    if (!timesheet) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        TimesheetMessages.TIMESHEET_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    return timesheet;
  }

  async getReminder(userId: number): Promise<TimesheetReminderResult> {
    const profile = await this.requireResourceProfileByUserId(userId);

    if (profile.timesheetSubmissionFrozen) {
      return {
        showReminder: true,
        missingWeekStart: profile.timesheetFrozenForWeekStart,
        message: TimesheetMessages.SUBMISSION_FROZEN,
        submissionFrozen: true,
        frozenForWeekStart: profile.timesheetFrozenForWeekStart,
      };
    }

    const currentWeekStart = getWeekStart(todayDateOnly());
    const priorWeekStart = addDays(currentWeekStart, -TimesheetRules.DAYS_IN_WEEK);
    const priorWeekEnd = getWeekEnd(priorWeekStart);

    const allocations = await this.allocationRepository.listOverlappingViewsForResourceProfile(
      profile.id,
      priorWeekStart,
      priorWeekEnd,
    );

    if (allocations.length === 0) {
      return {
        showReminder: false,
        missingWeekStart: null,
        message: null,
        submissionFrozen: false,
        frozenForWeekStart: null,
      };
    }

    const priorTimesheet = await this.timesheetRepository.findByResourceProfileAndWeek(
      profile.id,
      priorWeekStart,
    );

    if (priorTimesheet?.status === TimesheetStatus.SUBMITTED) {
      return {
        showReminder: false,
        missingWeekStart: null,
        message: null,
        submissionFrozen: false,
        frozenForWeekStart: null,
      };
    }

    if (priorTimesheet?.status === TimesheetStatus.MISSED) {
      return {
        showReminder: false,
        missingWeekStart: formatDateOnly(priorWeekStart),
        message: null,
        submissionFrozen: false,
        frozenForWeekStart: null,
      };
    }

    appLogger.info('Timesheet reminder triggered', {
      resourceProfileId: profile.id,
      missingWeekStart: formatDateOnly(priorWeekStart),
    });

    return {
      showReminder: true,
      missingWeekStart: formatDateOnly(priorWeekStart),
      message: `You have not submitted your timesheet for the week starting ${formatDateOnly(priorWeekStart)}.`,
      submissionFrozen: false,
      frozenForWeekStart: null,
    };
  }

  async submit(
    userId: number,
    weekStartInput: string,
    entries: SubmitTimesheetEntryInput[],
  ): Promise<{ message: string; timesheet: TimesheetWeekView }> {
    const profile = await this.requireResourceProfileByUserId(userId);

    if (profile.timesheetSubmissionFrozen) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        TimesheetMessages.SUBMISSION_FROZEN,
        ErrorTitles.FORBIDDEN,
      );
    }

    const weekStart = this.resolveWeekStart(weekStartInput);

    if (isFutureWeek(weekStart)) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        TimesheetMessages.FUTURE_WEEK_NOT_ALLOWED,
        ErrorTitles.BAD_REQUEST,
      );
    }

    const existing = await this.timesheetRepository.findByResourceProfileAndWeek(
      profile.id,
      weekStart,
    );
    if (existing) {
      if (existing.status === TimesheetStatus.PENDING) {
        await this.timesheetRepository.deleteTimesheetForWeek(profile.id, weekStart);
      } else {
        throw new AppError(
          HttpStatus.CONFLICT,
          TimesheetMessages.DUPLICATE_WEEK_SUBMISSION,
          ErrorTitles.CONFLICT,
        );
      }
    }

    if (entries.length === 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        TimesheetMessages.NO_ENTRIES_PROVIDED,
        ErrorTitles.BAD_REQUEST,
      );
    }

    const maxWeeklyHours = await this.getMaxWeeklyHours();
    const weekEnd = getWeekEnd(weekStart);
    const allocationCaps = await this.buildProjectAllocationCaps(
      profile.id,
      weekStart,
      weekEnd,
      maxWeeklyHours,
    );

    this.validateSubmissionEntries(entries, allocationCaps, maxWeeklyHours);
    await this.validateActivityTags(entries);

    const timesheet = await this.timesheetRepository.createWithEntries({
      resourceProfileId: profile.id,
      weekStart,
      status: TimesheetStatus.SUBMITTED,
      entries,
    });

    appLogger.info('Timesheet submitted', {
      resourceProfileId: profile.id,
      timesheetId: timesheet.id,
      weekStart: timesheet.weekStart,
      totalHours: timesheet.totalHours,
    });

    await this.complianceService?.resolveOnSubmit(profile.id, weekStart);

    return {
      message: TimesheetMessages.TIMESHEET_SUBMITTED,
      timesheet,
    };
  }

  async getTeamTimesheets(
    managerUserId: number,
    weekStartInput?: string,
  ): Promise<ManagerTeamTimesheetResult> {
    const weekStart = this.resolveWeekStart(weekStartInput);
    const weekEnd = getWeekEnd(weekStart);
    const teamMembers = await this.resourceProfileRepository.listTeamMembers(managerUserId);

    appLogger.info('Fetching manager team timesheets', {
      managerUserId,
      weekStart: formatDateOnly(weekStart),
      teamSize: teamMembers.length,
    });

    const resourceProfileIds = teamMembers.map((member) => member.id);
    const submittedRows = await this.timesheetRepository.listTeamEntriesForWeek(
      resourceProfileIds,
      weekStart,
    );
    const hoursByResourceProject = new Map<string, number>();
    const statusByResourceProfile = new Map<number, TimesheetStatus>();

    for (const row of submittedRows) {
      hoursByResourceProject.set(`${row.resourceProfileId}:${row.projectId}`, row.hours ?? 0);
      if (row.timesheetStatus) {
        statusByResourceProfile.set(row.resourceProfileId, row.timesheetStatus);
      }
    }

    const rows = [];

    for (const member of teamMembers) {
      const allocations = await this.allocationRepository.listOverlappingViewsForResourceProfile(
        member.id,
        weekStart,
        weekEnd,
      );
      const seenProjectIds = new Set<number>();

      for (const allocation of allocations) {
        if (seenProjectIds.has(allocation.projectId)) {
          continue;
        }

        seenProjectIds.add(allocation.projectId);
        const hoursKey = `${member.id}:${allocation.projectId}`;

        rows.push({
          resourceProfileId: member.id,
          employeeName: member.fullName,
          projectId: allocation.projectId,
          projectName: allocation.projectName,
          hours: hoursByResourceProject.get(hoursKey) ?? null,
          timesheetStatus: statusByResourceProfile.get(member.id) ?? null,
        });
      }
    }

    const submittedResourceProfileIds = new Set(
      submittedRows.map((row) => row.resourceProfileId),
    );

    return {
      weekStart: formatDateOnly(weekStart),
      weekEnd: formatDateOnly(weekEnd),
      rows,
      summary: {
        employeeCount: teamMembers.length,
        submittedCount: submittedResourceProfileIds.size,
      },
    };
  }

  async getEmployeeTimesheetDetail(
    managerUserId: number,
    resourceProfileId: number,
    weekStartInput?: string,
  ): Promise<TimesheetWeekView> {
    const teamMember = await this.resourceProfileRepository.findTeamMember(
      managerUserId,
      resourceProfileId,
    );

    if (!teamMember) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        TimesheetMessages.EMPLOYEE_NOT_IN_TEAM,
        ErrorTitles.NOT_FOUND,
      );
    }

    const weekStart = this.resolveWeekStart(weekStartInput);
    const timesheet = await this.timesheetRepository.findByResourceProfileAndWeek(
      resourceProfileId,
      weekStart,
    );

    if (!timesheet) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        TimesheetMessages.TIMESHEET_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    appLogger.info('Fetched employee timesheet detail for manager', {
      managerUserId,
      resourceProfileId,
      weekStart: formatDateOnly(weekStart),
    });

    return timesheet;
  }

  async listRecentActivityLabels(resourceProfileId: number): Promise<string[]> {
    const sinceWeekStart = addDays(
      getWeekStart(todayDateOnly()),
      -(TimesheetRules.RECENT_ACTIVITY_WEEKS - 1) * TimesheetRules.DAYS_IN_WEEK,
    );
    const records = await this.timesheetRepository.listRecentActivityTags(
      resourceProfileId,
      sinceWeekStart,
      TimesheetRules.RECENT_ACTIVITY_WEEKS * 3,
    );

    const uniqueLabels: string[] = [];
    const seen = new Set<string>();

    for (const record of records) {
      if (seen.has(record.label)) {
        continue;
      }

      seen.add(record.label);
      uniqueLabels.push(record.label);

      if (uniqueLabels.length >= TimesheetRules.RECENT_ACTIVITY_WEEKS) {
        break;
      }
    }

    return uniqueLabels;
  }

  private async requireResourceProfileByUserId(userId: number) {
    const profile = await this.resourceProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        TimesheetMessages.EMPLOYEE_PROFILE_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    return profile;
  }

  private resolveWeekStart(weekStartInput?: string) {
    if (!weekStartInput) {
      return getWeekStart(todayDateOnly());
    }

    try {
      return parseWeekStart(weekStartInput);
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        TimesheetMessages.INVALID_WEEK_START,
        ErrorTitles.BAD_REQUEST,
      );
    }
  }

  private async getMaxWeeklyHours(): Promise<number> {
    const config = await this.systemConfigRepository.get();

    if (!config) {
      throw new AppError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'System configuration is not available',
        ErrorTitles.INTERNAL_SERVER_ERROR,
      );
    }

    return config.maxWeeklyHours;
  }

  private async buildProjectAllocationCaps(
    resourceProfileId: number,
    weekStart: Date,
    weekEnd: Date,
    maxWeeklyHours: number,
  ): Promise<ProjectAllocationCap[]> {
    const allocations = await this.allocationRepository.listOverlappingViewsForResourceProfile(
      resourceProfileId,
      weekStart,
      weekEnd,
    );
    const capsByProject = new Map<number, ProjectAllocationCap>();

    for (const allocation of allocations) {
      const existing = capsByProject.get(allocation.projectId);

      if (existing) {
        existing.utilizationPercent += allocation.utilizationPercent;
        existing.maxHoursForWeek = this.calculateProjectHourCap(
          existing.utilizationPercent,
          maxWeeklyHours,
        );
        continue;
      }

      capsByProject.set(allocation.projectId, {
        projectId: allocation.projectId,
        projectName: allocation.projectName,
        utilizationPercent: allocation.utilizationPercent,
        maxHoursForWeek: this.calculateProjectHourCap(
          allocation.utilizationPercent,
          maxWeeklyHours,
        ),
        fromDate: allocation.fromDate,
        toDate: allocation.toDate,
      });
    }

    return Array.from(capsByProject.values());
  }

  private calculateProjectHourCap(utilizationPercent: number, maxWeeklyHours: number): number {
    return (utilizationPercent * maxWeeklyHours) / 100;
  }

  private validateSubmissionEntries(
    entries: SubmitTimesheetEntryInput[],
    allocationCaps: ProjectAllocationCap[],
    maxWeeklyHours: number,
  ): void {
    const projectIds = new Set<number>();
    let totalHours = 0;
    const capByProjectId = new Map(allocationCaps.map((cap) => [cap.projectId, cap]));

    for (const entry of entries) {
      if (projectIds.has(entry.projectId)) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          TimesheetMessages.DUPLICATE_PROJECT_IN_SUBMISSION,
          ErrorTitles.BAD_REQUEST,
        );
      }

      projectIds.add(entry.projectId);

      const allocationCap = capByProjectId.get(entry.projectId);
      if (!allocationCap) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          TimesheetMessages.PROJECT_NOT_ALLOCATED_FOR_WEEK(`Project ${entry.projectId}`),
          ErrorTitles.BAD_REQUEST,
        );
      }

      if (entry.hours > allocationCap.maxHoursForWeek) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          TimesheetMessages.HOURS_EXCEED_PROJECT_CAP(
            allocationCap.projectName,
            entry.hours,
            allocationCap.maxHoursForWeek,
          ),
          ErrorTitles.BAD_REQUEST,
        );
      }

      totalHours += entry.hours;
    }

    if (totalHours > maxWeeklyHours) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        TimesheetMessages.TOTAL_HOURS_EXCEEDED(totalHours, maxWeeklyHours),
        ErrorTitles.BAD_REQUEST,
      );
    }
  }

  private async validateActivityTags(entries: SubmitTimesheetEntryInput[]): Promise<void> {
    const tagIds = [...new Set(entries.flatMap((entry) => entry.tags.map((tag) => tag.activityTagId)))];

    if (tagIds.length === 0) {
      return;
    }

    const tags = await this.activityTagRepository.findByIds(tagIds);
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));

    if (tags.length !== tagIds.length) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        TimesheetMessages.INVALID_ACTIVITY_TAG,
        ErrorTitles.BAD_REQUEST,
      );
    }

    const otherTag = await this.activityTagRepository.findByName(
      TimesheetRules.OTHER_ACTIVITY_TAG_NAME,
    );

    for (const entry of entries) {
      for (const tagInput of entry.tags) {
        const tag = tagById.get(tagInput.activityTagId);

        if (!tag) {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            TimesheetMessages.INVALID_ACTIVITY_TAG,
            ErrorTitles.BAD_REQUEST,
          );
        }

        const isOtherTag = otherTag?.id === tag.id;

        if (isOtherTag && !tagInput.customText?.trim()) {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            TimesheetMessages.CUSTOM_TEXT_REQUIRED_FOR_OTHER,
            ErrorTitles.BAD_REQUEST,
          );
        }

        if (!isOtherTag && tagInput.customText?.trim()) {
          throw new AppError(
            HttpStatus.BAD_REQUEST,
            TimesheetMessages.CUSTOM_TEXT_NOT_ALLOWED,
            ErrorTitles.BAD_REQUEST,
          );
        }
      }
    }
  }
}

