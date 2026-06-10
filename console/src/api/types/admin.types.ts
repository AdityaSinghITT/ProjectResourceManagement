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
  employeeId: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  utilizationPercent: number;
  fromDate: string;
  toDate: string;
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
  schedulerIntervalHours: number;
  maxWeeklyHours: number;
}

export interface DeactivationPreview {
  employee: EmployeeListItem;
  activeAllocations: AllocationView[];
}
