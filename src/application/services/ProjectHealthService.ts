import { MilestoneStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import { ISystemConfigRepository } from '../../domain/interfaces/ISystemConfigRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import { MilestoneView } from '../../domain/types/admin.types';
import {
  ProjectHealthEvaluation,
  ProjectHealthStatus,
  ProjectRiskFlag,
} from '../../domain/types/projectHealth.types';
import { ProjectHealthMessages } from '../../shared/constants/projectHealthMessages';
import { ProjectHealthRules } from '../../shared/constants/projectHealthRules';
import { formatDateOnly, parseIsoDate, todayDateOnly } from '../../shared/utils/date.utils';
import { addDays, getWeekEnd, getWeekStart } from '../utils/week.utils';

interface EmployeeWeekExpectation {
  employeeId: number;
  employeeName: string;
  utilizationPercent: number;
  expectedHours: number;
}

const HEALTH_PRIORITY: Record<ProjectHealthStatus, number> = {
  ON_TRACK: 0,
  ATTENTION: 1,
  AT_RISK: 2,
};

export class ProjectHealthService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly timesheetRepository: ITimesheetRepository,
    private readonly systemConfigRepository: ISystemConfigRepository,
  ) {}

  async evaluateProject(projectId: number): Promise<ProjectHealthEvaluation> {
    const [milestones, maxWeeklyHours, priorWeekStart, priorWeekEnd] = await Promise.all([
      this.projectRepository.listMilestones(projectId),
      this.getMaxWeeklyHours(),
      Promise.resolve(this.getPriorCompletedWeekStart()),
      Promise.resolve(getWeekEnd(this.getPriorCompletedWeekStart())),
    ]);

    const [allocations, loggedHours] = await Promise.all([
      this.allocationRepository.listOverlappingViewsForProject(
        projectId,
        priorWeekStart,
        priorWeekEnd,
      ),
      this.timesheetRepository.listProjectHoursByEmployeeForWeek(projectId, priorWeekStart),
    ]);

    return this.buildEvaluation({
      milestones: milestones.milestones,
      allocations,
      loggedHours,
      maxWeeklyHours,
      priorWeekStart,
      priorWeekEnd,
      referenceDate: todayDateOnly(),
    });
  }

  buildEvaluation(input: {
    milestones: MilestoneView[];
    allocations: Array<{
      employeeId: number;
      employeeName: string;
      utilizationPercent: number;
    }>;
    loggedHours: Array<{ employeeId: number; employeeName: string; hours: number }>;
    maxWeeklyHours: number;
    priorWeekStart: Date;
    priorWeekEnd: Date;
    referenceDate: Date;
  }): ProjectHealthEvaluation {
    const milestoneFlags = this.evaluateMilestoneFlags(input.milestones, input.referenceDate);
    const hourFlags = this.evaluateHourFlags(
      input.allocations,
      input.loggedHours,
      input.maxWeeklyHours,
    );
    const riskFlags = [...milestoneFlags, ...hourFlags];

    return {
      healthStatus: this.resolveOverallStatus(riskFlags),
      riskFlags,
      evaluatedWeekStart: formatDateOnly(input.priorWeekStart),
      evaluatedWeekEnd: formatDateOnly(input.priorWeekEnd),
    };
  }

  getPriorCompletedWeekStart(referenceDate: Date = todayDateOnly()): Date {
    const currentWeekStart = getWeekStart(referenceDate);
    return addDays(currentWeekStart, -7);
  }

  private evaluateMilestoneFlags(milestones: MilestoneView[], referenceDate: Date): ProjectRiskFlag[] {
    const flags: ProjectRiskFlag[] = [];
    const todayMs = referenceDate.getTime();
    const dueSoonCutoff = addDays(
      referenceDate,
      ProjectHealthRules.MILESTONE_DUE_SOON_DAYS,
    ).getTime();

    for (const milestone of milestones) {
      const dueDate = parseIsoDate(milestone.dueDate);
      const dueMs = dueDate.getTime();

      if (milestone.status === MilestoneStatus.IN_PROGRESS && dueMs < todayMs) {
        flags.push({
          type: 'OVERDUE_MILESTONE',
          milestoneId: milestone.id,
          message: ProjectHealthMessages.OVERDUE_MILESTONE(milestone.title, milestone.dueDate),
        });
        continue;
      }

      if (
        milestone.status === MilestoneStatus.NOT_STARTED &&
        dueMs >= todayMs &&
        dueMs <= dueSoonCutoff
      ) {
        flags.push({
          type: 'MILESTONE_DUE_SOON',
          milestoneId: milestone.id,
          message: ProjectHealthMessages.MILESTONE_DUE_SOON(milestone.title, milestone.dueDate),
        });
      }
    }

    return flags;
  }

  private evaluateHourFlags(
    allocations: Array<{
      employeeId: number;
      employeeName: string;
      utilizationPercent: number;
    }>,
    loggedHours: Array<{ employeeId: number; employeeName: string; hours: number }>,
    maxWeeklyHours: number,
  ): ProjectRiskFlag[] {
    const expectations = this.buildEmployeeExpectations(allocations, maxWeeklyHours);
    if (expectations.length === 0) {
      return [];
    }

    const loggedByEmployee = new Map(loggedHours.map((entry) => [entry.employeeId, entry.hours]));
    const flags: ProjectRiskFlag[] = [];

    for (const expectation of expectations) {
      const logged = loggedByEmployee.get(expectation.employeeId) ?? 0;
      const percentOfExpected =
        expectation.expectedHours > 0 ? (logged / expectation.expectedHours) * 100 : 100;

      if (percentOfExpected < ProjectHealthRules.LOW_HOURS_THRESHOLD_PERCENT) {
        flags.push({
          type: 'LOW_HOURS',
          employeeId: expectation.employeeId,
          message: ProjectHealthMessages.LOW_HOURS(
            expectation.employeeName,
            logged,
            expectation.expectedHours,
          ),
        });
        continue;
      }

      if (percentOfExpected <= ProjectHealthRules.PARTIAL_HOURS_THRESHOLD_PERCENT) {
        flags.push({
          type: 'PARTIAL_HOURS',
          employeeId: expectation.employeeId,
          message: ProjectHealthMessages.PARTIAL_HOURS(
            expectation.employeeName,
            logged,
            expectation.expectedHours,
          ),
        });
      }
    }

    return flags;
  }

  private buildEmployeeExpectations(
    allocations: Array<{
      employeeId: number;
      employeeName: string;
      utilizationPercent: number;
    }>,
    maxWeeklyHours: number,
  ): EmployeeWeekExpectation[] {
    const byEmployee = new Map<number, EmployeeWeekExpectation>();

    for (const allocation of allocations) {
      const existing = byEmployee.get(allocation.employeeId);

      if (existing) {
        existing.utilizationPercent += allocation.utilizationPercent;
        existing.expectedHours = this.calculateExpectedHours(
          existing.utilizationPercent,
          maxWeeklyHours,
        );
        continue;
      }

      byEmployee.set(allocation.employeeId, {
        employeeId: allocation.employeeId,
        employeeName: allocation.employeeName,
        utilizationPercent: allocation.utilizationPercent,
        expectedHours: this.calculateExpectedHours(
          allocation.utilizationPercent,
          maxWeeklyHours,
        ),
      });
    }

    return Array.from(byEmployee.values());
  }

  private calculateExpectedHours(utilizationPercent: number, maxWeeklyHours: number): number {
    return (utilizationPercent * maxWeeklyHours) / 100;
  }

  private resolveOverallStatus(flags: ProjectRiskFlag[]): ProjectHealthStatus {
    let status: ProjectHealthStatus = 'ON_TRACK';

    for (const flag of flags) {
      const flagStatus: ProjectHealthStatus =
        flag.type === 'OVERDUE_MILESTONE' || flag.type === 'LOW_HOURS'
          ? 'AT_RISK'
          : 'ATTENTION';

      if (HEALTH_PRIORITY[flagStatus] > HEALTH_PRIORITY[status]) {
        status = flagStatus;
      }
    }

    return status;
  }

  private async getMaxWeeklyHours(): Promise<number> {
    const config = await this.systemConfigRepository.get();
    return config?.maxWeeklyHours ?? 40;
  }
}
