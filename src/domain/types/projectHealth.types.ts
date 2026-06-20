import { AllocationView } from './allocation.types';
import { MilestoneListResult, ProjectListItem } from './admin.types';

export type ProjectHealthStatus = 'ON_TRACK' | 'ATTENTION' | 'AT_RISK';

export type ProjectRiskFlagType =
  | 'OVERDUE_MILESTONE'
  | 'MILESTONE_DUE_SOON'
  | 'LOW_HOURS'
  | 'PARTIAL_HOURS';

export interface ProjectRiskFlag {
  type: ProjectRiskFlagType;
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

export interface ManagerProjectListItem extends ProjectListItem {
  healthStatus: ProjectHealthStatus;
}

export interface ManagerProjectDetailResult {
  project: ManagerProjectListItem;
  milestones: MilestoneListResult;
  allocations: AllocationView[];
  health: ProjectHealthEvaluation;
}
