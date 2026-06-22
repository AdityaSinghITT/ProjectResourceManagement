import { Prisma, TimesheetStatus } from '@prisma/client';
import { getWeekEnd } from '../../../application/utils/week.utils';
import {
  CreateMissedTimesheetInput,
  CreatePendingTimesheetInput,
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

const timesheetWithResourceProfileInclude = {
  ...timesheetInclude,
  resourceProfile: {
    include: {
      user: { select: { fullName: true } },
    },
  },
} as const;

type TimesheetWithEntries = Prisma.TimesheetGetPayload<{
  include: typeof timesheetInclude;
}>;

type TimesheetWithResourceProfile = Prisma.TimesheetGetPayload<{
  include: typeof timesheetWithResourceProfileInclude;
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
  async findByResourceProfileAndWeek(
    resourceProfileId: number,
    weekStart: Date,
  ): Promise<TimesheetWeekView | null> {
    const timesheet = await prisma.timesheet.findUnique({
      where: {
        resourceProfileId_weekStart: {
          resourceProfileId,
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
        resourceProfileId: input.resourceProfileId,
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

  async createMissedTimesheet(input: CreateMissedTimesheetInput): Promise<TimesheetWeekView> {
    const timesheet = await prisma.timesheet.create({
      data: {
        resourceProfileId: input.resourceProfileId,
        weekStart: input.weekStart,
        status: TimesheetStatus.MISSED,
        entries: {
          create: input.projectIds.map((projectId) => ({
            projectId,
            hours: 0,
          })),
        },
      },
      include: timesheetInclude,
    });

    return mapTimesheetWeekView(timesheet);
  }

  async createPendingTimesheet(input: CreatePendingTimesheetInput): Promise<TimesheetWeekView> {
    const timesheet = await prisma.timesheet.create({
      data: {
        resourceProfileId: input.resourceProfileId,
        weekStart: input.weekStart,
        status: TimesheetStatus.PENDING,
        entries: {
          create: input.projectIds.map((projectId) => ({
            projectId,
            hours: 0,
          })),
        },
      },
      include: timesheetInclude,
    });

    return mapTimesheetWeekView(timesheet);
  }

  async promotePendingToMissed(
    resourceProfileId: number,
    weekStart: Date,
  ): Promise<TimesheetWeekView> {
    const existing = await prisma.timesheet.findUnique({
      where: {
        resourceProfileId_weekStart: {
          resourceProfileId,
          weekStart,
        },
      },
    });

    if (existing?.status === TimesheetStatus.MISSED) {
      const timesheet = await prisma.timesheet.findUniqueOrThrow({
        where: { id: existing.id },
        include: timesheetInclude,
      });
      return mapTimesheetWeekView(timesheet);
    }

    if (existing?.status === TimesheetStatus.PENDING) {
      const updated = await prisma.timesheet.update({
        where: { id: existing.id },
        data: { status: TimesheetStatus.MISSED },
        include: timesheetInclude,
      });
      return mapTimesheetWeekView(updated);
    }

    return this.createMissedTimesheet({
      resourceProfileId,
      weekStart,
      projectIds: existing
        ? (
            await prisma.timesheetEntry.findMany({
              where: { timesheetId: existing.id },
              select: { projectId: true },
            })
          ).map((entry) => entry.projectId)
        : [],
    });
  }

  async deleteTimesheetForWeek(resourceProfileId: number, weekStart: Date): Promise<void> {
    await prisma.timesheet.deleteMany({
      where: {
        resourceProfileId,
        weekStart,
        status: { in: [TimesheetStatus.PENDING, TimesheetStatus.MISSED] },
      },
    });
  }

  async listHistoryByResourceProfile(resourceProfileId: number): Promise<TimesheetHistoryResult> {
    const timesheets = await prisma.timesheet.findMany({
      where: { resourceProfileId },
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
        pending: mapped.filter((item) => item.status === TimesheetStatus.PENDING).length,
        missed: mapped.filter((item) => item.status === TimesheetStatus.MISSED).length,
      },
    };
  }

  async listRecentActivityTags(
    resourceProfileId: number,
    sinceWeekStart: Date,
    limit: number,
  ): Promise<RecentActivityTagRecord[]> {
    const timesheets = await prisma.timesheet.findMany({
      where: {
        resourceProfileId,
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
    resourceProfileIds: number[],
    weekStart: Date,
  ): Promise<
    Array<{
      resourceProfileId: number;
      employeeName: string;
      projectId: number;
      projectName: string;
      hours: number | null;
      timesheetStatus: TimesheetStatus | null;
    }>
  > {
    if (resourceProfileIds.length === 0) {
      return [];
    }

    const timesheets = await prisma.timesheet.findMany({
      where: {
        resourceProfileId: { in: resourceProfileIds },
        weekStart,
      },
      include: timesheetWithResourceProfileInclude,
    });

    return timesheets.flatMap((timesheet: TimesheetWithResourceProfile) =>
      timesheet.entries.map((entry) => ({
        resourceProfileId: timesheet.resourceProfileId,
        employeeName: timesheet.resourceProfile.user.fullName,
        projectId: entry.projectId,
        projectName: entry.project.name,
        hours: decimalToNumber(entry.hours),
        timesheetStatus: timesheet.status,
      })),
    );
  }

  async listProjectHoursByResourceProfileForWeek(
    projectId: number,
    weekStart: Date,
  ): Promise<Array<{ resourceProfileId: number; employeeName: string; hours: number }>> {
    const entries = await prisma.timesheetEntry.findMany({
      where: {
        projectId,
        timesheet: { weekStart },
      },
      include: {
        timesheet: {
          include: {
            resourceProfile: {
              include: {
                user: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    const hoursByResourceProfile = new Map<
      number,
      { employeeName: string; hours: number }
    >();

    for (const entry of entries) {
      const existing = hoursByResourceProfile.get(entry.timesheet.resourceProfileId);
      const entryHours = decimalToNumber(entry.hours);

      if (existing) {
        existing.hours += entryHours;
        continue;
      }

      hoursByResourceProfile.set(entry.timesheet.resourceProfileId, {
        employeeName: entry.timesheet.resourceProfile.user.fullName,
        hours: entryHours,
      });
    }

    return Array.from(hoursByResourceProfile.entries()).map(([resourceProfileId, value]) => ({
      resourceProfileId,
      employeeName: value.employeeName,
      hours: value.hours,
    }));
  }
}
