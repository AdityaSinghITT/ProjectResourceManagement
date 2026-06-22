import { TimesheetStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import { SchedulerConfig } from '../../shared/constants/schedulerConfig';
import { appLogger } from '../../shared/logger/appLogger';
import { formatDateOnly } from '../../shared/utils/date.utils';
import { addDays, getWeekEnd, getWeekStart } from '../utils/week.utils';

export interface MissedTimesheetSweepResult {
  scannedWeeks: number;
  scannedResources: number;
  createdCount: number;
}

export class MissedTimesheetService {
  constructor(
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly timesheetRepository: ITimesheetRepository,
  ) {}

  async flagMissedTimesheets(asOfDate: Date): Promise<MissedTimesheetSweepResult> {
    const currentWeekStart = getWeekStart(asOfDate);
    const completedWeekStarts = Array.from(
      { length: SchedulerConfig.MISSED_TIMESHEET_LOOKBACK_WEEKS },
      (_, index) => addDays(currentWeekStart, -(index + 1) * 7),
    );

    const { employees } = await this.resourceProfileRepository.list({});
    let createdCount = 0;

    for (const weekStart of completedWeekStarts) {
      if (weekStart.getTime() === addDays(currentWeekStart, -7).getTime()) {
        continue;
      }

      for (const employee of employees) {
        const created = await this.flagMissedForResourceWeek(employee.id, weekStart);
        if (created) {
          createdCount += 1;
        }
      }
    }

    appLogger.info('Missed timesheet sweep completed', {
      scannedWeeks: completedWeekStarts.length,
      scannedResources: employees.length,
      createdCount,
    });

    return {
      scannedWeeks: completedWeekStarts.length,
      scannedResources: employees.length,
      createdCount,
    };
  }

  async flagMissedForResourceWeek(
    resourceProfileId: number,
    weekStart: Date,
  ): Promise<boolean> {
    const weekEnd = getWeekEnd(weekStart);
    const allocations = await this.allocationRepository.listOverlappingViewsForResourceProfile(
      resourceProfileId,
      weekStart,
      weekEnd,
    );

    if (allocations.length === 0) {
      return false;
    }

    const existing = await this.timesheetRepository.findByResourceProfileAndWeek(
      resourceProfileId,
      weekStart,
    );

    if (existing) {
      return false;
    }

    const projectIds = [...new Set(allocations.map((allocation) => allocation.projectId))];

    await this.timesheetRepository.createMissedTimesheet({
      resourceProfileId,
      weekStart,
      projectIds,
    });

    appLogger.info('Missed timesheet created', {
      resourceProfileId,
      weekStart: formatDateOnly(weekStart),
      projectCount: projectIds.length,
      status: TimesheetStatus.MISSED,
    });

    return true;
  }
}
