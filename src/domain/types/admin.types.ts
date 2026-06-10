import {
  EmployeeStatus,
  LlmProvider,
  MilestoneStatus,
  ProficiencyLevel,
  ProjectStatus,
  Role,
  SkillCategory,
} from '@prisma/client';

export interface AdminUserListItem {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface AdminUserListResult {
  users: AdminUserListItem[];
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
  status: EmployeeStatus;
  isActive: boolean;
  managerId: number | null;
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
  category: SkillCategory;
  proficiency: ProficiencyLevel;
}

export interface ProjectListItem {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  managerId: number;
  managerName: string;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export interface MilestoneView {
  id: number;
  projectId: number;
  title: string;
  dueDate: string;
  status: MilestoneStatus;
  storyPoints: number;
  sortOrder: number;
}

export interface MilestoneListResult {
  milestones: MilestoneView[];
  summary: {
    totalStoryPoints: number;
    completedStoryPoints: number;
    remainingStoryPoints: number;
  };
}

export interface CreateUserResult {
  user: import('./user.types').UserProfile;
  employee?: EmployeeListItem;
}

export interface SystemConfigView {
  llmProvider: LlmProvider;
  llmApiKeyMasked: string;
  schedulerIntervalHours: number;
  maxWeeklyHours: number;
}

export interface ActiveAllocationPreview {
  projectId: number;
  projectName: string;
  utilizationPercent: number;
  fromDate: string;
  toDate: string;
}
