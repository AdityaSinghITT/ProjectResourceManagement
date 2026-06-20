import { ProjectHealthEvaluation } from './projectHealth.types';

export interface SkillMatchCandidate {
  resourceProfileId: number;
  fullName: string;
  department: string | null;
  designation: string | null;
  utilizationPercent: number;
  availabilityPercent: number;
  skills: Array<{ name: string; proficiency: string }>;
  recentActivityTags: string[];
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

export interface AiRiskSummaryResult {
  aiGenerated: true;
  disclaimer: string;
  projectId: number;
  projectName: string;
  summary: string;
  health: ProjectHealthEvaluation;
}
