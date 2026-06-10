import { TimesheetStatus } from '@prisma/client';
import {
  RecentActivityTagRecord,
  SubmitTimesheetEntryInput,
  TimesheetHistoryResult,
  TimesheetWeekView,
} from '../types/timesheet.types';

export interface CreateTimesheetInput {
  employeeId: number;
  weekStart: Date;
  status: TimesheetStatus;
  entries: SubmitTimesheetEntryInput[];
}

export interface ITimesheetRepository {
  findByEmployeeAndWeek(employeeId: number, weekStart: Date): Promise<TimesheetWeekView | null>;
  createWithEntries(input: CreateTimesheetInput): Promise<TimesheetWeekView>;
  listHistoryByEmployee(employeeId: number): Promise<TimesheetHistoryResult>;
  listRecentActivityTags(
    employeeId: number,
    sinceWeekStart: Date,
    limit: number,
  ): Promise<RecentActivityTagRecord[]>;
  listTeamEntriesForWeek(
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
  >;
  listProjectHoursByEmployeeForWeek(
    projectId: number,
    weekStart: Date,
  ): Promise<Array<{ employeeId: number; employeeName: string; hours: number }>>;
}
