export interface EmployeeAllocation {
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
  allocations: EmployeeAllocation[];
}

export interface TimesheetHistoryItem {
  id: number;
  weekStart: string;
  weekEnd: string;
  status: 'SUBMITTED' | 'MISSED';
  totalHours: number;
}

export interface TimesheetHistoryResult {
  timesheets: TimesheetHistoryItem[];
  summary: {
    submitted: number;
    missed: number;
  };
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
  status: 'SUBMITTED' | 'MISSED';
  totalHours: number;
  entries: TimesheetEntryView[];
}

export interface TimesheetReminderResult {
  showReminder: boolean;
  missingWeekStart: string | null;
  message: string | null;
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

export interface SubmitTimesheetRequest {
  weekStart: string;
  entries: SubmitTimesheetEntryInput[];
}

export interface SubmitTimesheetResponse {
  message: string;
  timesheet: TimesheetWeekView;
}

export interface ActivityTag {
  id: number;
  name: string;
  sortOrder: number;
}
