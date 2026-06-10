import { HttpClient } from './HttpClient';
import {
  AllocationRequest,
  AllocationValidationResult,
  AllocationView,
  EmployeeDashboardDetail,
  ManagerProjectDetailResult,
  ManagerProjectListResult,
  ManagerTeamTimesheetResult,
  ResourceDashboardResult,
} from './types/manager.types';

export class ManagerApi {
  constructor(private readonly http: HttpClient) {}

  listProjects(): Promise<ManagerProjectListResult> {
    return this.http.get<ManagerProjectListResult>('/api/manager/projects');
  }

  getProjectDetail(projectId: number): Promise<ManagerProjectDetailResult> {
    return this.http.get<ManagerProjectDetailResult>(`/api/manager/projects/${projectId}`);
  }

  getDashboard(): Promise<ResourceDashboardResult> {
    return this.http.get<ResourceDashboardResult>('/api/manager/dashboard');
  }

  getEmployeeDetail(employeeId: number): Promise<EmployeeDashboardDetail> {
    return this.http.get<EmployeeDashboardDetail>(`/api/manager/dashboard/employees/${employeeId}`);
  }

  validateAllocation(body: AllocationRequest): Promise<AllocationValidationResult> {
    return this.http.post<AllocationValidationResult>('/api/manager/allocations/validate', body);
  }

  createAllocation(body: AllocationRequest): Promise<{ message: string; allocation: AllocationView }> {
    return this.http.post('/api/manager/allocations', body);
  }

  endAllocation(allocationId: number): Promise<{ message: string; allocation: AllocationView }> {
    return this.http.patch(`/api/manager/allocations/${allocationId}/end`);
  }

  getTeamTimesheets(weekStart?: string): Promise<ManagerTeamTimesheetResult> {
    return this.http.get<ManagerTeamTimesheetResult>('/api/manager/timesheets', { weekStart });
  }

  getEmployeeTimesheet(employeeId: number, weekStart?: string): Promise<unknown> {
    return this.http.get(`/api/manager/timesheets/${employeeId}`, { weekStart });
  }
}
