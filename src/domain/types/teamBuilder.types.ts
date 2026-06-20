import { ProficiencyLevel } from '@prisma/client';

export interface TeamBuilderActiveAllocation {
  projectName: string;
  toDate: string;
}

export interface TeamBuilderCandidate {
  resourceProfileId: number;
  fullName: string;
  department: string | null;
  designation: string | null;
  utilizationPercent: number;
  availabilityPercent: number;
  skills: Array<{ name: string; proficiency: ProficiencyLevel }>;
  recentActivityTags: string[];
  activeAllocations: TeamBuilderActiveAllocation[];
}

export interface TeamBuilderSkillRequirement {
  skillName: string;
  minProficiency: ProficiencyLevel;
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

export interface TeamBuilderContext {
  requirement: string;
  assignableCandidates: TeamBuilderCandidate[];
  allCandidates: TeamBuilderCandidate[];
}
