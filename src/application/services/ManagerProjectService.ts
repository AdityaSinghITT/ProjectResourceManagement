import { ProjectStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import {
  ManagerProjectDetailResult,
  ManagerProjectListItem,
} from '../../domain/types/projectHealth.types';
import { AppError } from '../../shared/errors/AppError';
import { ManagerMessages } from '../../shared/constants/managerMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { todayDateOnly } from '../../shared/utils/date.utils';
import { appLogger } from '../../shared/logger/appLogger';
import { ProjectHealthService } from './ProjectHealthService';

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

export class ManagerProjectService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly projectHealthService: ProjectHealthService,
  ) {}

  async listProjects(managerUserId: number): Promise<ManagerProjectListResult> {
    appLogger.info('Listing manager projects', { managerUserId });

    const projects = await this.projectRepository.listByManager(managerUserId);
    const projectsWithHealth = await Promise.all(
      projects.map(async (project) => {
        const health = await this.projectHealthService.evaluateProject(project.id);
        return {
          ...project,
          healthStatus: health.healthStatus,
        };
      }),
    );

    return {
      projects: projectsWithHealth,
      summary: {
        total: projectsWithHealth.length,
        planned: projectsWithHealth.filter((project) => project.status === ProjectStatus.PLANNED)
          .length,
        active: projectsWithHealth.filter((project) => project.status === ProjectStatus.ACTIVE)
          .length,
        onHold: projectsWithHealth.filter((project) => project.status === ProjectStatus.ON_HOLD)
          .length,
        onTrack: projectsWithHealth.filter((project) => project.healthStatus === 'ON_TRACK')
          .length,
        attention: projectsWithHealth.filter((project) => project.healthStatus === 'ATTENTION')
          .length,
        atRisk: projectsWithHealth.filter((project) => project.healthStatus === 'AT_RISK').length,
      },
    };
  }

  async getProjectDetail(
    managerUserId: number,
    projectId: number,
  ): Promise<ManagerProjectDetailResult> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        ManagerMessages.PROJECT_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    if (project.managerId !== managerUserId) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ManagerMessages.PROJECT_NOT_OWNED,
        ErrorTitles.FORBIDDEN,
      );
    }

    appLogger.info('Fetching manager project detail', { managerUserId, projectId });

    const today = todayDateOnly();
    const [milestones, allocations, health] = await Promise.all([
      this.projectRepository.listMilestones(projectId),
      this.allocationRepository.listOverlappingViewsForProject(projectId, today, today),
      this.projectHealthService.evaluateProject(projectId),
    ]);

    return {
      project: {
        ...project,
        healthStatus: health.healthStatus,
      },
      milestones,
      allocations,
      health,
    };
  }
}
