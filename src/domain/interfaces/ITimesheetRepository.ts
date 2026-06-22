import { TimesheetStatus } from '@prisma/client';
import {
  RecentActivityTagRecord,
  SubmitTimesheetEntryInput,
  TimesheetHistoryResult,
  TimesheetWeekView,
} from '../types/timesheet.types';

export interface CreateTimesheetInput {
  resourceProfileId: number;
  weekStart: Date;
  status: TimesheetStatus;
  entries: SubmitTimesheetEntryInput[];
}

export interface CreateMissedTimesheetInput {
  resourceProfileId: number;
  weekStart: Date;
  projectIds: number[];
}

export interface CreatePendingTimesheetInput {
  resourceProfileId: number;
  weekStart: Date;
  projectIds: number[];
}

export interface ITimesheetRepository {
  findByResourceProfileAndWeek(
    resourceProfileId: number,
    weekStart: Date,
  ): Promise<TimesheetWeekView | null>;
  createWithEntries(input: CreateTimesheetInput): Promise<TimesheetWeekView>;
  createMissedTimesheet(input: CreateMissedTimesheetInput): Promise<TimesheetWeekView>;
  createPendingTimesheet(input: CreatePendingTimesheetInput): Promise<TimesheetWeekView>;
  promotePendingToMissed(resourceProfileId: number, weekStart: Date): Promise<TimesheetWeekView>;
  deleteTimesheetForWeek(resourceProfileId: number, weekStart: Date): Promise<void>;
  listHistoryByResourceProfile(resourceProfileId: number): Promise<TimesheetHistoryResult>;
  listRecentActivityTags(
    resourceProfileId: number,
    sinceWeekStart: Date,
    limit: number,
  ): Promise<RecentActivityTagRecord[]>;
  listTeamEntriesForWeek(
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
  >;
  listProjectHoursByResourceProfileForWeek(
    projectId: number,
    weekStart: Date,
  ): Promise<Array<{ resourceProfileId: number; employeeName: string; hours: number }>>;
}
