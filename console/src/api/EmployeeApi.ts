import { HttpClient } from './HttpClient';
import {
  EmployeeAllocationsResult,
  SubmitTimesheetRequest,
  SubmitTimesheetResponse,
  TimesheetHistoryResult,
  TimesheetReminderResult,
  TimesheetWeekView,
} from './types/employee.types';

export class EmployeeApi {
  constructor(private readonly http: HttpClient) {}

  getAllocations(weekStart?: string): Promise<EmployeeAllocationsResult> {
    return this.http.get<EmployeeAllocationsResult>('/api/employee/allocations', { weekStart });
  }

  getReminder(): Promise<TimesheetReminderResult> {
    return this.http.get<TimesheetReminderResult>('/api/employee/timesheets/reminder');
  }

  listTimesheets(): Promise<TimesheetHistoryResult> {
    return this.http.get<TimesheetHistoryResult>('/api/employee/timesheets');
  }

  getWeekDetail(weekStart: string): Promise<TimesheetWeekView> {
    return this.http.get<TimesheetWeekView>(`/api/employee/timesheets/${weekStart}`);
  }

  submitTimesheet(body: SubmitTimesheetRequest): Promise<SubmitTimesheetResponse> {
    return this.http.post<SubmitTimesheetResponse>('/api/employee/timesheets', body);
  }
}
