import { Prisma, TimesheetStatus } from '@prisma/client';
import { getWeekEnd } from '../../../application/utils/week.utils';
import {
  CreateTimesheetInput,
  ITimesheetRepository,
} from '../../../domain/interfaces/ITimesheetRepository';
import {
  RecentActivityTagRecord,
  TimesheetEntryTagView,
  TimesheetEntryView,
  TimesheetHistoryResult,
  TimesheetWeekView,
} from '../../../domain/types/timesheet.types';
import { TimesheetRules } from '../../../shared/constants/timesheetRules';
import { formatDateOnly } from '../../../shared/utils/date.utils';
import { prisma } from '../client';

const timesheetInclude = {
  entries: {
    orderBy: { id: 'asc' as const },
    include: {
      project: { select: { id: true, name: true } },
      tags: {
        orderBy: { id: 'asc' as const },
        include: {
          activityTag: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

const timesheetWithEmployeeInclude = {
  ...timesheetInclude,
  employee: {
    include: {
      user: { select: { fullName: true } },
    },
  },
} as const;

type TimesheetWithEntries = Prisma.TimesheetGetPayload<{
  include: typeof timesheetInclude;
}>;

type TimesheetWithEmployee = Prisma.TimesheetGetPayload<{
  include: typeof timesheetWithEmployeeInclude;
}>;

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value);
}

function sumEntryHours(entries: { hours: Prisma.Decimal }[]): number {
  return entries.reduce((sum, entry) => sum + decimalToNumber(entry.hours), 0);
}

function mapEntryTag(tag: {
  activityTagId: number;
  customText: string | null;
  activityTag: { name: string };
}): TimesheetEntryTagView {
  return {
    activityTagId: tag.activityTagId,
    activityTagName: tag.activityTag.name,
    customText: tag.customText,
  };
}

function mapEntry(entry: TimesheetWithEntries['entries'][number]): TimesheetEntryView {
  return {
    id: entry.id,
    projectId: entry.projectId,
    projectName: entry.project.name,
    hours: decimalToNumber(entry.hours),
    tags: entry.tags.map(mapEntryTag),
  };
}

function mapTimesheetWeekView(timesheet: TimesheetWithEntries): TimesheetWeekView {
  const weekStartDate = timesheet.weekStart;

  return {
    id: timesheet.id,
    weekStart: formatDateOnly(weekStartDate),
    weekEnd: formatDateOnly(getWeekEnd(weekStartDate)),
    status: timesheet.status,
    totalHours: sumEntryHours(timesheet.entries),
    entries: timesheet.entries.map(mapEntry),
  };
}

function buildActivityTagLabel(tagName: string, customText: string | null): string {
  if (tagName === TimesheetRules.OTHER_ACTIVITY_TAG_NAME && customText) {
    return customText;
  }

  return tagName;
}

export class PrismaTimesheetRepository implements ITimesheetRepository {
  async findByEmployeeAndWeek(
    employeeId: number,
    weekStart: Date,
  ): Promise<TimesheetWeekView | null> {
    const timesheet = await prisma.timesheet.findUnique({
      where: {
        employeeId_weekStart: {
          employeeId,
          weekStart,
        },
      },
      include: timesheetInclude,
    });

    return timesheet ? mapTimesheetWeekView(timesheet) : null;
  }

  async createWithEntries(input: CreateTimesheetInput): Promise<TimesheetWeekView> {
    const timesheet = await prisma.timesheet.create({
      data: {
        employeeId: input.employeeId,
        weekStart: input.weekStart,
        status: input.status,
        entries: {
          create: input.entries.map((entry) => ({
            projectId: entry.projectId,
            hours: entry.hours,
            tags: {
              create: entry.tags.map((tag) => ({
                activityTagId: tag.activityTagId,
                customText: tag.customText ?? null,
              })),
            },
          })),
        },
      },
      include: timesheetInclude,
    });

    return mapTimesheetWeekView(timesheet);
  }

  async listHistoryByEmployee(employeeId: number): Promise<TimesheetHistoryResult> {
    const timesheets = await prisma.timesheet.findMany({
      where: { employeeId },
      orderBy: { weekStart: 'desc' },
      include: {
        entries: { select: { hours: true } },
      },
    });

    const mapped = timesheets.map((timesheet) => ({
      id: timesheet.id,
      weekStart: formatDateOnly(timesheet.weekStart),
      weekEnd: formatDateOnly(getWeekEnd(timesheet.weekStart)),
      status: timesheet.status,
      totalHours: sumEntryHours(timesheet.entries),
    }));

    return {
      timesheets: mapped,
      summary: {
        submitted: mapped.filter((item) => item.status === TimesheetStatus.SUBMITTED).length,
        missed: mapped.filter((item) => item.status === TimesheetStatus.MISSED).length,
      },
    };
  }

  async listRecentActivityTags(
    employeeId: number,
    sinceWeekStart: Date,
    limit: number,
  ): Promise<RecentActivityTagRecord[]> {
    const timesheets = await prisma.timesheet.findMany({
      where: {
        employeeId,
        weekStart: { gte: sinceWeekStart },
        status: TimesheetStatus.SUBMITTED,
      },
      orderBy: { weekStart: 'desc' },
      include: timesheetInclude,
    });

    const records: RecentActivityTagRecord[] = [];

    for (const timesheet of timesheets) {
      for (const entry of timesheet.entries) {
        for (const tag of entry.tags) {
          records.push({
            label: buildActivityTagLabel(tag.activityTag.name, tag.customText),
            weekStart: formatDateOnly(timesheet.weekStart),
          });

          if (records.length >= limit) {
            return records;
          }
        }
      }
    }

    return records;
  }

  async listTeamEntriesForWeek(
    employeeIds: number[],
    weekStart: Date,
  ): Promise<
    Array<{
      employeeId: number;
      employeeName: string;
      projectId: number;
      projectName: string;
      hours: number | null;
      timesheetStatus: TimesheetStatus | null;
    }>
  > {
    if (employeeIds.length === 0) {
      return [];
    }

    const timesheets = await prisma.timesheet.findMany({
      where: {
        employeeId: { in: employeeIds },
        weekStart,
      },
      include: timesheetWithEmployeeInclude,
    });

    return timesheets.flatMap((timesheet: TimesheetWithEmployee) =>
      timesheet.entries.map((entry) => ({
        employeeId: timesheet.employeeId,
        employeeName: timesheet.employee.user.fullName,
        projectId: entry.projectId,
        projectName: entry.project.name,
        hours: decimalToNumber(entry.hours),
        timesheetStatus: timesheet.status,
      })),
    );
  }

  async listProjectHoursByEmployeeForWeek(
    projectId: number,
    weekStart: Date,
  ): Promise<Array<{ employeeId: number; employeeName: string; hours: number }>> {
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        projectId,
        timesheet: { weekStart },
      },
      include: {
        timesheet: {
          include: {
            employee: {
              include: {
                user: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    const hoursByEmployee = new Map<number, { employeeName: string; hours: number }>();

    for (const entry of entries) {
      const existing = hoursByEmployee.get(entry.timesheet.employeeId);
      const entryHours = decimalToNumber(entry.hours);

      if (existing) {
        existing.hours += entryHours;
        continue;
      }

      hoursByEmployee.set(entry.timesheet.employeeId, {
        employeeName: entry.timesheet.employee.user.fullName,
        hours: entryHours,
      });
    }

    return Array.from(hoursByEmployee.entries()).map(([employeeId, value]) => ({
      employeeId,
      employeeName: value.employeeName,
      hours: value.hours,
    }));
  }
}
