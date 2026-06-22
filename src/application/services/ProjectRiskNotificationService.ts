import { ProjectStatus } from '@prisma/client';
import { IEmailSender } from '../../domain/interfaces/IEmailSender';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import { IProjectRiskNotificationRepository } from '../../domain/interfaces/IProjectRiskNotificationRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { ProjectHealthStatus } from '../../domain/types/projectHealth.types';
import { appLogger } from '../../shared/logger/appLogger';
import { getWeekStart } from '../utils/week.utils';
import { AIService } from './AIService';
import { buildProjectAtRiskEmail } from './EmailTemplateService';
import { ProjectHealthService } from './ProjectHealthService';

export interface ProjectRiskNotificationSweepResult {
  scannedProjects: number;
  atRiskCount: number;
  emailsSent: number;
}

export interface ProjectRiskNotificationSweepOptions {
  projectIds?: number[];
}

export class ProjectRiskNotificationService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly projectHealthService: ProjectHealthService,
    private readonly riskNotificationRepository: IProjectRiskNotificationRepository,
    private readonly userRepository: IUserRepository,
    private readonly emailSender: IEmailSender,
    private readonly aiService: AIService,
  ) {}

  async run(
    asOfDate: Date,
    options?: ProjectRiskNotificationSweepOptions,
  ): Promise<ProjectRiskNotificationSweepResult> {
    const evaluatedWeekStart = getWeekStart(asOfDate);
    const projects = await this.projectRepository.list();
    const projectIdFilter = options?.projectIds ? new Set(options.projectIds) : null;
    let activeProjects = projects.filter((project) => project.status === ProjectStatus.ACTIVE);
    if (projectIdFilter) {
      activeProjects = activeProjects.filter((project) => projectIdFilter.has(project.id));
    }

    const result: ProjectRiskNotificationSweepResult = {
      scannedProjects: activeProjects.length,
      atRiskCount: 0,
      emailsSent: 0,
    };

    for (const project of activeProjects) {
      const health = await this.projectHealthService.evaluateProject(project.id);
      if (health.healthStatus !== 'AT_RISK') {
        continue;
      }

      result.atRiskCount += 1;

      const alreadySent = await this.riskNotificationRepository.wasNotified(
        project.id,
        evaluatedWeekStart,
      );
      if (alreadySent) {
        continue;
      }

      const manager = await this.userRepository.findById(project.managerId);
      if (!manager?.email) {
        continue;
      }

      const riskSummary = await this.buildRiskSummary(project.managerId, project.id);
      const suggestedHelp = await this.buildSuggestedHelp(project.id, health.riskFlags);

      const email = buildProjectAtRiskEmail({
        managerName: manager.fullName,
        projectName: project.name,
        healthLabel: mapHealthLabel(health.healthStatus),
        riskSummary,
        suggestedHelp,
      });

      await this.emailSender.send({
        to: manager.email,
        subject: email.subject,
        text: email.text,
      });

      await this.riskNotificationRepository.recordSent(project.id, evaluatedWeekStart);
      result.emailsSent += 1;

      appLogger.info('Project at-risk notification sent', {
        projectId: project.id,
        managerId: project.managerId,
      });
    }

    appLogger.info('Project risk notification sweep completed', { ...result });
    return result;
  }

  private async buildRiskSummary(managerUserId: number, projectId: number): Promise<string> {
    try {
      const summary = await this.aiService.riskSummary(managerUserId, projectId);
      return summary.summary;
    } catch (error) {
      appLogger.warn('AI risk summary unavailable for notification email', { projectId, error });
      return 'Review milestone deadlines and logged hours against allocations.';
    }
  }

  private async buildSuggestedHelp(
    projectId: number,
    riskFlags: Array<{ message: string }>,
  ): Promise<string> {
    const requirement = riskFlags.map((flag) => flag.message).join('; ').slice(0, 500);
    if (!requirement.trim()) {
      return 'No specific skill suggestions available. Review team allocations.';
    }

    try {
      const matches = await this.aiService.skillMatch(requirement);
      if (matches.matches.length === 0) {
        return 'No matching bench resources found. Consider reallocating or hiring.';
      }

      return matches.matches
        .slice(0, 3)
        .map((match) => `- ${match.fullName}: ${match.reason}`)
        .join('\n');
    } catch (error) {
      appLogger.warn('Skill match unavailable for at-risk notification', { projectId, error });
      return 'Skill match unavailable. Review team capacity manually.';
    }
  }
}

function mapHealthLabel(status: ProjectHealthStatus): string {
  if (status === 'AT_RISK') {
    return 'Red (AT_RISK)';
  }

  if (status === 'ATTENTION') {
    return 'Amber (ATTENTION)';
  }

  return 'Green (ON_TRACK)';
}
