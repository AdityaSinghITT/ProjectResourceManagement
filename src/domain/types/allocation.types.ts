import { Department, Designation, ResourceStatus } from '@prisma/client';

export interface AllocationView {
  id: number;
  resourceProfileId: number;
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

export interface AllocationValidationResult {
  valid: boolean;
  message: string;
  currentUtilizationPercent: number;
  newUtilizationPercent: number;
  totalUtilizationPercent: number;
  employeeName: string;
}

export interface DashboardEmployeeSummary {
  id: number;
  userId: number;
  fullName: string;
  department: Department | null;
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
  department: Department | null;
  designation: Designation | null;
  currentStatus: ResourceStatus;
  utilizationPercent: number;
  profileSkills: string[];
  activeAllocations: AllocationView[];
  recentActivityTags: string[];
}

export interface OverlappingAllocationRecord {
  id: number;
  utilizationPercent: number;
  fromDate: Date;
  toDate: Date;
}
