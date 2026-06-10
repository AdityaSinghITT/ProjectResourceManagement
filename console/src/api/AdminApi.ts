import { HttpClient } from './HttpClient';
import {
  AllocationListResult,
  DeactivationPreview,
  EmployeeListResult,
  EmployeeSkillView,
  ProjectListItem,
  SystemConfigView,
  UserListResult,
} from './types/admin.types';
import { MilestoneListResult, MilestoneView } from './types/manager.types';

export class AdminApi {
  constructor(private readonly http: HttpClient) {}

  createUser(body: Record<string, unknown>): Promise<unknown> {
    return this.http.post('/api/admin/users', body);
  }

  listUsers(): Promise<UserListResult> {
    return this.http.get<UserListResult>('/api/admin/users');
  }

  reactivateUser(userId: number): Promise<unknown> {
    return this.http.patch(`/api/admin/users/${userId}/reactivate`);
  }

  resetUserPassword(userId: number, newTemporaryPassword: string): Promise<unknown> {
    return this.http.post(`/api/admin/users/${userId}/reset-password`, { newTemporaryPassword });
  }

  resetUserPasswordByIdentifier(
    usernameOrUserId: string,
    newTemporaryPassword: string,
  ): Promise<unknown> {
    return this.http.post('/api/admin/users/reset-password', {
      usernameOrUserId,
      newTemporaryPassword,
    });
  }

  deactivateUser(userId: number): Promise<unknown> {
    return this.http.patch(`/api/admin/users/${userId}/deactivate`);
  }

  listEmployees(filters?: { status?: string; department?: string }): Promise<EmployeeListResult> {
    return this.http.get<EmployeeListResult>('/api/admin/employees', filters);
  }

  updateEmployee(employeeId: number, body: Record<string, unknown>): Promise<unknown> {
    return this.http.patch(`/api/admin/employees/${employeeId}`, body);
  }

  previewEmployeeDeactivation(employeeId: number): Promise<DeactivationPreview> {
    return this.http.get<DeactivationPreview>(`/api/admin/employees/${employeeId}/deactivate/preview`);
  }

  deactivateEmployee(employeeId: number): Promise<unknown> {
    return this.http.post(`/api/admin/employees/${employeeId}/deactivate`);
  }

  assignManager(employeeUserId: number, managerUserId: number): Promise<unknown> {
    return this.http.post('/api/admin/employees/assign-manager', { employeeUserId, managerUserId });
  }

  listEmployeeSkills(employeeId: number): Promise<{ skills: EmployeeSkillView[] }> {
    return this.http.get(`/api/admin/employees/${employeeId}/skills`);
  }

  addEmployeeSkill(employeeId: number, body: Record<string, unknown>): Promise<unknown> {
    return this.http.post(`/api/admin/employees/${employeeId}/skills`, body);
  }

  updateEmployeeSkill(
    employeeId: number,
    skillId: number,
    proficiency: string,
  ): Promise<unknown> {
    return this.http.patch(`/api/admin/employees/${employeeId}/skills/${skillId}`, { proficiency });
  }

  removeEmployeeSkill(employeeId: number, skillId: number): Promise<unknown> {
    return this.http.delete(`/api/admin/employees/${employeeId}/skills/${skillId}`);
  }

  createProject(body: Record<string, unknown>): Promise<ProjectListItem> {
    return this.http.post<ProjectListItem>('/api/admin/projects', body);
  }

  listProjects(): Promise<{ projects: ProjectListItem[] }> {
    return this.http.get('/api/admin/projects');
  }

  updateProject(projectId: number, body: Record<string, unknown>): Promise<ProjectListItem> {
    return this.http.patch<ProjectListItem>(`/api/admin/projects/${projectId}`, body);
  }

  listMilestones(projectId: number): Promise<MilestoneListResult> {
    return this.http.get<MilestoneListResult>(`/api/admin/projects/${projectId}/milestones`);
  }

  createMilestone(projectId: number, body: Record<string, unknown>): Promise<MilestoneView> {
    return this.http.post(`/api/admin/projects/${projectId}/milestones`, body);
  }

  updateMilestone(
    projectId: number,
    milestoneId: number,
    body: Record<string, unknown>,
  ): Promise<MilestoneView> {
    return this.http.patch(
      `/api/admin/projects/${projectId}/milestones/${milestoneId}`,
      body,
    );
  }

  listAllocations(filters?: { employeeId?: number; projectId?: number }): Promise<AllocationListResult> {
    return this.http.get<AllocationListResult>('/api/admin/allocations', {
      employeeId: filters?.employeeId,
      projectId: filters?.projectId,
    });
  }

  getSystemConfig(): Promise<{ config: SystemConfigView }> {
    return this.http.get('/api/admin/system-config');
  }

  updateSystemConfig(body: Record<string, unknown>): Promise<unknown> {
    return this.http.patch('/api/admin/system-config', body);
  }
}
