export interface UserListItem {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export interface UserListResult {
  users: UserListItem[];
  summary: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface EmployeeListItem {
  id: number;
  userId: number;
  fullName: string;
  department: string;
  designation: string;
  status: string;
  isActive: boolean;
  managerName: string | null;
}

export interface EmployeeListResult {
  employees: EmployeeListItem[];
  summary: {
    total: number;
    allocated: number;
    bench: number;
  };
}

export interface EmployeeSkillView {
  id: number;
  skillId: number;
  skillName: string;
  category: string;
  proficiency: string;
}

export interface ProjectListItem {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  managerId: number;
  managerName: string;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export interface AllocationView {
  id: number;
  resourceProfileId: number;
  employeeId?: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  utilizationPercent: number;
  fromDate: string;
  toDate: string;
}

export interface DeactivationPreviewEmployee {
  id: number;
  userId: number;
  fullName: string;
  department: string | null;
  designation?: string | null;
  resourceStatus: string;
  status?: string;
  isActive: boolean;
  managerName?: string | null;
}

export interface AllocationListResult {
  allocations: AllocationView[];
  summary: {
    totalActive: number;
  };
}

export interface SystemConfigView {
  llmProvider: string;
  llmApiKeyMasked: string;
  llmBaseUrl: string | null;
  llmModel: string | null;
  schedulerIntervalHours: number;
  maxWeeklyHours: number;
}

export interface DeactivationPreview {
  employee: DeactivationPreviewEmployee;
  activeAllocations: AllocationView[];
}
