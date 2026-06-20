import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { ISystemConfigRepository } from '../../domain/interfaces/ISystemConfigRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import { AiRiskSummaryResult, SkillMatchCandidate, SkillMatchResult } from '../../domain/types/ai.types';
import { TeamBuilderResult } from '../../domain/types/teamBuilder.types';
import { ILLMProvider } from '../../infrastructure/llm/ILLMProvider';
import { LLMProviderFactory } from '../../infrastructure/llm/LLMProviderFactory';
import { AiMessages } from '../../shared/constants/aiMessages';
import { AllocationRules } from '../../shared/constants/allocationRules';
import { LlmConfig } from '../../shared/constants/llmConfig';
import { TimesheetRules } from '../../shared/constants/timesheetRules';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { todayDateOnly } from '../../shared/utils/date.utils';
import { addDays, getWeekStart } from '../utils/week.utils';
import { calculateAvailabilityPercent } from '../utils/allocationOverlap.util';
import { extractJsonArray, parseRequirement } from '../utils/aiRequirement.utils';
import { buildTeamBuilderContext } from '../utils/teamBuilderContext.utils';
import { buildTeamBuilderPrompt } from '../utils/teamBuilderPrompt.utils';
import { parseTeamBuilderResponse } from '../utils/teamBuilderParser.utils';
import { repairTeamBuilderRoles } from '../utils/teamBuilderResponseRepair.utils';
import {
  enrichGapRolesWithCandidateDates,
  validateTeamBuilderResponse,
} from '../utils/teamBuilderResponseValidator';
import { ProjectHealthService } from './ProjectHealthService';

export class AIService {
  constructor(
    private readonly systemConfigRepository: ISystemConfigRepository,
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly timesheetRepository: ITimesheetRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly projectHealthService: ProjectHealthService,
  ) {}

  async skillMatch(requirement: string): Promise<SkillMatchResult> {
    const llm = await this.createProvider();
    const maxWeeklyHours = await this.getMaxWeeklyHours();
    const { requiredUtilizationPercent } = parseRequirement(requirement, maxWeeklyHours);
    const today = todayDateOnly();

    const organizationResources = await this.resourceProfileRepository.listOrganizationResources();
    const candidates: SkillMatchCandidate[] = [];

    for (const member of organizationResources) {
      if (!member.isActive) {
        continue;
      }

      const utilizationPercent = await this.allocationRepository.getCurrentUtilizationPercent(
        member.id,
        today,
      );

      if (utilizationPercent >= AllocationRules.MAX_UTILIZATION_PERCENT) {
        continue;
      }

      const availabilityPercent = calculateAvailabilityPercent(utilizationPercent);
      if (
        requiredUtilizationPercent !== null &&
        availabilityPercent < requiredUtilizationPercent
      ) {
        continue;
      }

      const skills = await this.resourceProfileRepository.listSkills(member.userId);
      const sinceWeekStart = addDays(
        getWeekStart(today),
        -TimesheetRules.RECENT_ACTIVITY_WEEKS * TimesheetRules.DAYS_IN_WEEK,
      );
      const recentTags = await this.timesheetRepository.listRecentActivityTags(
        member.id,
        sinceWeekStart,
        8,
      );

      candidates.push({
        resourceProfileId: member.id,
        fullName: member.fullName,
        department: member.department,
        designation: member.designation,
        utilizationPercent,
        availabilityPercent,
        skills: skills.map((skill) => ({
          name: skill.skillName,
          proficiency: skill.proficiency,
        })),
        recentActivityTags: recentTags.map((tag) => tag.label),
      });
    }

    if (candidates.length === 0) {
      return {
        aiGenerated: true,
        disclaimer: AiMessages.DISCLAIMER,
        requirement,
        requiredUtilizationPercent,
        matches: [],
        preFilteredCount: 0,
      };
    }

    const prompt = buildSkillMatchPrompt(requirement, candidates);
    const llmText = await this.safeComplete(llm, prompt);
    const matches = parseSkillMatchResponse(llmText, candidates);

    return {
      aiGenerated: true,
      disclaimer: AiMessages.DISCLAIMER,
      requirement,
      requiredUtilizationPercent,
      matches,
      preFilteredCount: candidates.length,
    };
  }

  async buildTeam(requirement: string): Promise<TeamBuilderResult> {
    const llm = await this.createProvider();
    const today = todayDateOnly();
    const context = await buildTeamBuilderContext(
      requirement,
      this.resourceProfileRepository,
      this.allocationRepository,
      this.timesheetRepository,
      today,
    );

    if (context.allCandidates.length === 0) {
      return {
        aiGenerated: true,
        disclaimer: AiMessages.TEAM_BUILDER_DISCLAIMER,
        requirement,
        roles: [],
        assignableCount: 0,
        totalCandidateCount: 0,
      };
    }

    const prompt = buildTeamBuilderPrompt(
      requirement,
      context.assignableCandidates,
      context.allCandidates,
    );
    const llmText = await this.safeComplete(llm, prompt);
    const parsedRoles = parseTeamBuilderResponse(llmText);
    const repairedRoles = repairTeamBuilderRoles(
      parsedRoles,
      context.assignableCandidates,
      context.allCandidates,
    );
    validateTeamBuilderResponse(repairedRoles, context.assignableCandidates);
    const roles = enrichGapRolesWithCandidateDates(repairedRoles, context.allCandidates);

    return {
      aiGenerated: true,
      disclaimer: AiMessages.TEAM_BUILDER_DISCLAIMER,
      requirement,
      roles,
      assignableCount: context.assignableCandidates.length,
      totalCandidateCount: context.allCandidates.length,
    };
  }

  async riskSummary(managerUserId: number, projectId: number): Promise<AiRiskSummaryResult> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, AiMessages.PROJECT_NOT_FOUND, ErrorTitles.NOT_FOUND);
    }

    if (project.managerId !== managerUserId) {
      throw new AppError(HttpStatus.FORBIDDEN, AiMessages.PROJECT_NOT_OWNED, ErrorTitles.FORBIDDEN);
    }

    const health = await this.projectHealthService.evaluateProject(projectId);
    const llm = await this.createProvider();
    const prompt = buildRiskSummaryPrompt(project.name, health);
    const summary = await this.safeComplete(llm, prompt);

    return {
      aiGenerated: true,
      disclaimer: AiMessages.RISK_DISCLAIMER,
      projectId: project.id,
      projectName: project.name,
      summary,
      health,
    };
  }

  private async createProvider(): Promise<ILLMProvider> {
    const config = await this.systemConfigRepository.getLlmRuntimeConfig();
    return LLMProviderFactory.fromConfig(config);
  }

  private async getMaxWeeklyHours(): Promise<number> {
    const config = await this.systemConfigRepository.get();
    return config?.maxWeeklyHours ?? 40;
  }

  private async safeComplete(llm: ILLMProvider, prompt: string): Promise<string> {
    const trimmedPrompt =
      prompt.length > LlmConfig.MAX_PROMPT_CHARS
        ? `${prompt.slice(0, LlmConfig.MAX_PROMPT_CHARS)}\n...(truncated)`
        : prompt;

    try {
      return await llm.complete(trimmedPrompt);
    } catch {
      throw new AppError(
        HttpStatus.BAD_GATEWAY,
        AiMessages.GENERATION_FAILED,
        ErrorTitles.SERVICE_UNAVAILABLE,
      );
    }
  }
}

function buildSkillMatchPrompt(requirement: string, candidates: SkillMatchCandidate[]): string {
  return [
    'You are an IT resource planning assistant.',
    'Rank the best matching employees across the organization for the requirement.',
    'Use ONLY the candidate data provided. Do not invent people or skills.',
    'Return ONLY a JSON array like:',
    '[{"resourceProfileId":1,"fullName":"Name","reason":"short reason"}]',
    'Include at most 5 matches, best first.',
    '',
    `Requirement: ${requirement}`,
    '',
    `Candidates JSON: ${JSON.stringify(candidates)}`,
  ].join('\n');
}

function parseSkillMatchResponse(
  llmText: string,
  candidates: SkillMatchCandidate[],
): SkillMatchResult['matches'] {
  try {
    const rows = extractJsonArray(llmText);
    const allowedIds = new Set(candidates.map((candidate) => candidate.resourceProfileId));

    return rows
      .map((row) => {
        if (!row || typeof row !== 'object') {
          return null;
        }

        const record = row as Record<string, unknown>;
        const resourceProfileId = Number(record.resourceProfileId);
        const fullName = typeof record.fullName === 'string' ? record.fullName : '';
        const reason = typeof record.reason === 'string' ? record.reason : '';

        if (!Number.isInteger(resourceProfileId) || !allowedIds.has(resourceProfileId)) {
          return null;
        }

        const candidate = candidates.find((item) => item.resourceProfileId === resourceProfileId);
        return {
          resourceProfileId,
          fullName: fullName || candidate?.fullName || 'Unknown',
          reason: reason || 'Suggested by AI',
        };
      })
      .filter((item): item is SkillMatchResult['matches'][number] => item !== null)
      .slice(0, 5);
  } catch {
    throw new AppError(
      HttpStatus.BAD_GATEWAY,
      AiMessages.INVALID_RESPONSE,
      ErrorTitles.SERVICE_UNAVAILABLE,
    );
  }
}

function buildRiskSummaryPrompt(
  projectName: string,
  health: AiRiskSummaryResult['health'],
): string {
  return [
    'You are a project health analyst for an IT services company.',
    'Write one concise plain-English paragraph (3-5 sentences) summarizing project health risks.',
    'Use ONLY the facts in the JSON. Do not invent data.',
    'Mention milestone issues and under-logged hours when present.',
    '',
    `Project: ${projectName}`,
    `Health JSON: ${JSON.stringify(health)}`,
  ].join('\n');
}
