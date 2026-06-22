import { HttpClient } from './HttpClient';
import {
  AiRiskSummaryResult,
  AllocationRequest,
  AllocationValidationResult,
  AllocationView,
  EmployeeDashboardDetail,
  ManagerProjectDetailResult,
  ManagerProjectListResult,
  ManagerTeamTimesheetResult,
  ResourceDashboardResult,
  SkillMatchResult,
  TeamBuilderResult,
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

  skillMatch(requirement: string): Promise<SkillMatchResult> {
    return this.http.post<SkillMatchResult>('/api/manager/ai/skill-match', { requirement });
  }

  allocationsAiMatch(requirement: string): Promise<SkillMatchResult> {
    return this.http.post<SkillMatchResult>('/api/manager/allocations/ai-match', { requirement });
  }

  teamBuilder(requirement: string): Promise<TeamBuilderResult> {
    return this.http.post<TeamBuilderResult>('/api/manager/ai/team-builder', { requirement });
  }

  projectRiskSummary(projectId: number): Promise<AiRiskSummaryResult> {
    return this.http.post<AiRiskSummaryResult>(`/api/manager/projects/${projectId}/ai-risk-summary`);
  }

  restoreTimesheetAccess(employeeId: number): Promise<{ message: string }> {
    return this.http.post<{ message: string }>(
      `/api/manager/employees/${employeeId}/restore-timesheet-access`,
    );
  }
}
