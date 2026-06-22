import { TimesheetStatus } from '@prisma/client';

export interface ActivityTagView {
  id: number;
  name: string;
  sortOrder: number;
}

export interface TimesheetEntryTagView {
  activityTagId: number;
  activityTagName: string;
  customText: string | null;
}

export interface TimesheetEntryView {
  id: number;
  projectId: number;
  projectName: string;
  hours: number;
  tags: TimesheetEntryTagView[];
}

export interface TimesheetWeekView {
  id: number;
  weekStart: string;
  weekEnd: string;
  status: TimesheetStatus;
  totalHours: number;
  entries: TimesheetEntryView[];
}

export interface TimesheetHistoryItem {
  id: number;
  weekStart: string;
  weekEnd: string;
  status: TimesheetStatus;
  totalHours: number;
}

export interface TimesheetHistoryResult {
  timesheets: TimesheetHistoryItem[];
  summary: {
    submitted: number;
    pending: number;
    missed: number;
  };
}

export interface TimesheetReminderResult {
  showReminder: boolean;
  missingWeekStart: string | null;
  message: string | null;
  submissionFrozen: boolean;
  frozenForWeekStart: string | null;
}

export interface EmployeeTimesheetAllocation {
  projectId: number;
  projectName: string;
  utilizationPercent: number;
  maxHoursForWeek: number;
  fromDate: string;
  toDate: string;
}

export interface EmployeeAllocationsResult {
  weekStart: string;
  weekEnd: string;
  allocations: EmployeeTimesheetAllocation[];
}

export interface SubmitTimesheetEntryTagInput {
  activityTagId: number;
  customText?: string;
}

export interface SubmitTimesheetEntryInput {
  projectId: number;
  hours: number;
  tags: SubmitTimesheetEntryTagInput[];
}

export interface ManagerTeamTimesheetRow {
  resourceProfileId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  hours: number | null;
  timesheetStatus: TimesheetStatus | null;
}

export interface ManagerTeamTimesheetResult {
  weekStart: string;
  weekEnd: string;
  rows: ManagerTeamTimesheetRow[];
  summary: {
    employeeCount: number;
    submittedCount: number;
  };
}

export interface RecentActivityTagRecord {
  label: string;
  weekStart: string;
}
