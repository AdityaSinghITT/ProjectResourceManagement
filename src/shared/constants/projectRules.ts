import { ProjectStatus } from '@prisma/client';

export const ProjectRules = {
  STATUSES_REQUIRING_ACTIVE_MANAGER: [ProjectStatus.PLANNED, ProjectStatus.ACTIVE] as const,
  DEFAULT_MILESTONE_SORT_ORDER: 0,
} as const;
