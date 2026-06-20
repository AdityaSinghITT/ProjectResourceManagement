export type ProjectHealthStatus = 'ON_TRACK' | 'ATTENTION' | 'AT_RISK';

export interface ManagerProjectListItem {
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
  healthStatus: ProjectHealthStatus;
}

export interface ManagerProjectListResult {
  projects: ManagerProjectListItem[];
  summary: {
    total: number;
    planned: number;
    active: number;
    onHold: number;
    onTrack: number;
    attention: number;
    atRisk: number;
  };
}

export interface ProjectRiskFlag {
  type: string;
  message: string;
  milestoneId?: number;
  employeeId?: number;
}

export interface ProjectHealthEvaluation {
  healthStatus: ProjectHealthStatus;
  riskFlags: ProjectRiskFlag[];
  evaluatedWeekStart: string;
  evaluatedWeekEnd: string;
}

export interface MilestoneView {
  id: number;
  projectId: number;
  title: string;
  dueDate: string;
  status: string;
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

export interface ManagerProjectDetailResult {
  project: ManagerProjectListItem;
  milestones: MilestoneListResult;
  allocations: AllocationView[];
  health: ProjectHealthEvaluation;
}

export interface DashboardEmployeeSummary {
  id: number;
  userId: number;
  fullName: string;
  department: string;
  skillsSummary: string;
  utilizationPercent: number;
  availabilityPercent: number;
  status: 'BENCH' | 'PARTIAL' | 'FULL';
}

export interface ResourceDashboardResult {
  monthLabel: string;
  bench: DashboardEmployeeSummary[];
  active: DashboardEmployeeSummary[];
  summary: {
    benchCount: number;
    partialCount: number;
    fullCount: number;
  };
}

export interface EmployeeDashboardDetail {
  id: number;
  fullName: string;
  department: string;
  designation: string;
  currentStatus: string;
  utilizationPercent: number;
  profileSkills: string[];
  activeAllocations: AllocationView[];
  recentActivityTags: string[];
}

export interface AllocationValidationResult {
  valid: boolean;
  message: string;
  currentUtilizationPercent: number;
  newUtilizationPercent: number;
  totalUtilizationPercent: number;
  employeeName: string;
}

export interface AllocationRequest {
  employeeId: number;
  projectId: number;
  utilizationPercent: number;
  fromDate: string;
  toDate: string;
}

export interface TeamTimesheetRow {
  resourceProfileId: number;
  employeeId?: number;
  employeeName: string;
  projectId: number;
  projectName: string;
  hours: number | null;
  timesheetStatus: 'SUBMITTED' | 'MISSED' | null;
}

export interface ManagerTeamTimesheetResult {
  weekStart: string;
  weekEnd: string;
  rows: TeamTimesheetRow[];
}

export interface SkillMatchResult {
  aiGenerated: true;
  disclaimer: string;
  requirement: string;
  requiredUtilizationPercent: number | null;
  matches: Array<{
    resourceProfileId: number;
    fullName: string;
    reason: string;
  }>;
  preFilteredCount: number;
}

export interface TeamBuilderSkillRequirement {
  skillName: string;
  minProficiency: string;
}

export interface TeamBuilderGap {
  reasonType: string;
  message: string;
  alternativeEmployeeName?: string | null;
  availableFromDate?: string | null;
}

export interface TeamBuilderRoleResult {
  roleTitle: string;
  requiredSkills: TeamBuilderSkillRequirement[];
  status: string;
  assignedEmployeeName?: string | null;
  matchScore?: number | null;
  reason?: string | null;
  gap?: TeamBuilderGap | null;
}

export interface TeamBuilderResult {
  aiGenerated: true;
  disclaimer: string;
  requirement: string;
  roles: TeamBuilderRoleResult[];
  assignableCount: number;
  totalCandidateCount: number;
}

export interface AiRiskSummaryResult {
  aiGenerated: true;
  disclaimer: string;
  projectId: number;
  projectName: string;
  summary: string;
  health: ProjectHealthEvaluation;
}
