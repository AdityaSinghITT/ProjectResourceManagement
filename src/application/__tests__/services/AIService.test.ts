import {
  Department,
  Designation,
  LlmProvider,
  ProjectStatus,
  ProficiencyLevel,
  ResourceStatus,
  SkillCategory,
} from '@prisma/client';
import { IAllocationRepository } from '../../../domain/interfaces/IAllocationRepository';
import { IProjectRepository } from '../../../domain/interfaces/IProjectRepository';
import { IResourceProfileRepository } from '../../../domain/interfaces/IResourceProfileRepository';
import { ISystemConfigRepository } from '../../../domain/interfaces/ISystemConfigRepository';
import { ITimesheetRepository } from '../../../domain/interfaces/ITimesheetRepository';
import { ILLMProvider } from '../../../infrastructure/llm/ILLMProvider';
import { LLMProviderFactory } from '../../../infrastructure/llm/LLMProviderFactory';
import { TeamBuilderConstants } from '../../../shared/constants/teamBuilderConstants';
import { HttpStatus } from '../../../shared/constants/httpStatusCodes';
import { AppError } from '../../../shared/errors/AppError';
import { AIService } from '../../services/AIService';
import { ProjectHealthService } from '../../services/ProjectHealthService';

jest.mock('../../../infrastructure/llm/LLMProviderFactory');

describe('AIService', () => {
  const llm: jest.Mocked<ILLMProvider> = {
    complete: jest.fn(),
  };

  const systemConfigRepository: jest.Mocked<ISystemConfigRepository> = {
    get: jest.fn(),
    update: jest.fn(),
    getLlmRuntimeConfig: jest.fn(),
  };

  const resourceProfileRepository: jest.Mocked<IResourceProfileRepository> = {
    create: jest.fn(),
    assignManager: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    clearReportingManagerForTeam: jest.fn(),
    countTeamMembers: jest.fn(),
    getActiveAllocations: jest.fn(),
    endActiveAllocations: jest.fn(),
    listSkills: jest.fn(),
    addSkill: jest.fn(),
    updateSkill: jest.fn(),
    removeSkill: jest.fn(),
    findUserSkill: jest.fn(),
    updateResourceStatus: jest.fn(),
    findTeamMember: jest.fn(),
    listTeamMembers: jest.fn(),
    listOrganizationResources: jest.fn(),
  };

  const allocationRepository: jest.Mocked<IAllocationRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    endAllocation: jest.fn(),
    listAdmin: jest.fn(),
    listOverlappingForResourceProfile: jest.fn(),
    listActiveByResourceProfile: jest.fn(),
    getCurrentUtilizationPercent: jest.fn(),
    listActiveViewsByResourceProfile: jest.fn(),
    listOverlappingViewsForResourceProfile: jest.fn(),
    listOverlappingViewsForProject: jest.fn(),
  };

  const timesheetRepository: jest.Mocked<ITimesheetRepository> = {
    findByResourceProfileAndWeek: jest.fn(),
    createWithEntries: jest.fn(),
    createMissedTimesheet: jest.fn(),
    listHistoryByResourceProfile: jest.fn(),
    listRecentActivityTags: jest.fn(),
    listTeamEntriesForWeek: jest.fn(),
    listProjectHoursByResourceProfileForWeek: jest.fn(),
  };

  const projectRepository: jest.Mocked<IProjectRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    listByManager: jest.fn(),
    holdActiveProjectsByManager: jest.fn(),
    countManagedActiveProjects: jest.fn(),
    listMilestones: jest.fn(),
    createMilestone: jest.fn(),
    findMilestone: jest.fn(),
    updateMilestone: jest.fn(),
  };

  const projectHealthService: jest.Mocked<Pick<ProjectHealthService, 'evaluateProject'>> = {
    evaluateProject: jest.fn(),
  };

  const service = new AIService(
    systemConfigRepository,
    resourceProfileRepository,
    allocationRepository,
    timesheetRepository,
    projectRepository,
    projectHealthService as unknown as ProjectHealthService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (LLMProviderFactory.fromConfig as jest.Mock).mockReturnValue(llm);
    systemConfigRepository.getLlmRuntimeConfig.mockResolvedValue({
      provider: LlmProvider.OLLAMA,
      baseUrl: 'http://localhost:11434',
      model: 'test-model',
      apiKey: null,
    });
    systemConfigRepository.get.mockResolvedValue({
      llmProvider: LlmProvider.OLLAMA,
      llmApiKeyMasked: '****',
      llmBaseUrl: 'http://localhost:11434',
      llmModel: 'test-model',
      schedulerIntervalHours: 4,
      maxWeeklyHours: 40,
    });
  });

  it('returns parsed skill matches from the LLM response', async () => {
    resourceProfileRepository.listOrganizationResources.mockResolvedValue([
      {
        id: 10,
        userId: 2,
        fullName: 'Ravi Kumar',
        department: Department.ENGINEERING,
        designation: Designation.SOFTWARE_ENGINEER,
        resourceStatus: ResourceStatus.ALLOCATED,
        isActive: true,
      },
    ]);
    allocationRepository.getCurrentUtilizationPercent.mockResolvedValue(50);
    resourceProfileRepository.listSkills.mockResolvedValue([
      {
        id: 1,
        skillId: 1,
        skillName: 'React',
        category: SkillCategory.FRONTEND,
        proficiency: ProficiencyLevel.ADVANCED,
      },
    ]);
    timesheetRepository.listRecentActivityTags.mockResolvedValue([
      { label: 'Frontend', weekStart: '2026-05-26' },
    ]);
    llm.complete.mockResolvedValue(
      '[{"resourceProfileId":10,"fullName":"Ravi Kumar","reason":"Strong React fit"}]',
    );

    const result = await service.skillMatch('React developer 50%');

    expect(result.matches).toEqual([
      {
        resourceProfileId: 10,
        fullName: 'Ravi Kumar',
        reason: 'Strong React fit',
      },
    ]);
    expect(result.preFilteredCount).toBe(1);
    expect(result.aiGenerated).toBe(true);
    expect(resourceProfileRepository.listOrganizationResources).toHaveBeenCalled();
    expect(resourceProfileRepository.listTeamMembers).not.toHaveBeenCalled();
  });

  it('throws when project is not owned by the manager', async () => {
    projectRepository.findById.mockResolvedValue({
      id: 5,
      name: 'Alpha Portal',
      description: '',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: ProjectStatus.ACTIVE,
      managerId: 999,
      managerName: 'Other Manager',
      totalStoryPoints: 100,
      completedStoryPoints: 20,
    });

    await expect(service.riskSummary(1, 5)).rejects.toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
    });
  });

  it('returns AI risk summary for owned project', async () => {
    const health = {
      healthStatus: 'AT_RISK' as const,
      riskFlags: [{ type: 'OVERDUE_MILESTONE' as const, message: 'Milestone overdue' }],
      evaluatedWeekStart: '2026-06-01',
      evaluatedWeekEnd: '2026-06-07',
    };

    projectRepository.findById.mockResolvedValue({
      id: 5,
      name: 'Alpha Portal',
      description: '',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: ProjectStatus.ACTIVE,
      managerId: 1,
      managerName: 'Ankit Shah',
      totalStoryPoints: 100,
      completedStoryPoints: 20,
    });
    projectHealthService.evaluateProject.mockResolvedValue(health);
    llm.complete.mockResolvedValue('Project is at risk due to overdue milestone.');

    const result = await service.riskSummary(1, 5);

    expect(result.summary).toContain('at risk');
    expect(result.health).toEqual(health);
    expect(result.projectName).toBe('Alpha Portal');
  });

  it('maps LLM failures to BAD_GATEWAY', async () => {
    resourceProfileRepository.listOrganizationResources.mockResolvedValue([
      {
        id: 10,
        userId: 2,
        fullName: 'Ravi Kumar',
        department: Department.ENGINEERING,
        designation: Designation.SOFTWARE_ENGINEER,
        resourceStatus: ResourceStatus.BENCH,
        isActive: true,
      },
    ]);
    allocationRepository.getCurrentUtilizationPercent.mockResolvedValue(0);
    resourceProfileRepository.listSkills.mockResolvedValue([]);
    timesheetRepository.listRecentActivityTags.mockResolvedValue([]);
    llm.complete.mockRejectedValue(new Error('network error'));

    const promise = service.skillMatch('any requirement');
    await expect(promise).rejects.toBeInstanceOf(AppError);
    await expect(promise).rejects.toMatchObject({
      statusCode: HttpStatus.BAD_GATEWAY,
    });
  });

  it('returns per-role team builder results from stub LLM', async () => {
    resourceProfileRepository.listOrganizationResources.mockResolvedValue([
      {
        id: 10,
        userId: 2,
        fullName: 'Priya Sharma',
        department: Department.ENGINEERING,
        designation: Designation.SOFTWARE_ENGINEER,
        resourceStatus: ResourceStatus.BENCH,
        isActive: true,
      },
      {
        id: 11,
        userId: 3,
        fullName: 'Ravi Kumar',
        department: Department.ENGINEERING,
        designation: Designation.SOFTWARE_ENGINEER,
        resourceStatus: ResourceStatus.ALLOCATED,
        isActive: true,
      },
    ]);
    allocationRepository.getCurrentUtilizationPercent.mockImplementation(async (id) =>
      id === 10 ? 0 : 100,
    );
    allocationRepository.listActiveViewsByResourceProfile.mockImplementation(async (id) =>
      id === 11
        ? [
            {
              id: 1,
              resourceProfileId: 11,
              employeeName: 'Ravi Kumar',
              projectId: 5,
              projectName: 'Alpha Portal',
              utilizationPercent: 100,
              fromDate: '2026-01-01',
              toDate: '2026-09-30',
            },
          ]
        : [],
    );
    resourceProfileRepository.listSkills.mockResolvedValue([
      {
        id: 1,
        skillId: 1,
        skillName: 'Java',
        category: SkillCategory.BACKEND,
        proficiency: ProficiencyLevel.ADVANCED,
      },
    ]);
    timesheetRepository.listRecentActivityTags.mockResolvedValue([]);

    llm.complete.mockResolvedValue(
      JSON.stringify({
        roles: [
          {
            roleTitle: 'Senior Java Developer',
            status: TeamBuilderConstants.STATUS_FILLED,
            requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
            assignedEmployeeName: 'Priya Sharma',
            matchScore: 92,
            reason: 'Advanced Java on bench.',
          },
          {
            roleTitle: 'DevOps Engineer',
            status: TeamBuilderConstants.STATUS_GAP,
            requiredSkills: [{ skillName: 'Docker', minProficiency: ProficiencyLevel.INTERMEDIATE }],
            gap: {
              reasonType: TeamBuilderConstants.GAP_ALLOCATED_ELSEWHERE,
              message: 'Ravi Kumar has skills but is allocated.',
              alternativeEmployeeName: 'Ravi Kumar',
              availableFromDate: '2026-09-30',
            },
          },
        ],
      }),
    );

    const result = await service.buildTeam('banking portal team');

    expect(result.roles).toHaveLength(2);
    expect(result.assignableCount).toBe(1);
    expect(result.totalCandidateCount).toBe(2);
    expect(result.roles[0].assignedEmployeeName).toBe('Priya Sharma');
    expect(result.roles[1].gap?.reasonType).toBe(TeamBuilderConstants.GAP_ALLOCATED_ELSEWHERE);
  });

  it('repairs duplicate team builder assignments into a gap role', async () => {
    resourceProfileRepository.listOrganizationResources.mockResolvedValue([
      {
        id: 10,
        userId: 2,
        fullName: 'Priya Sharma',
        department: Department.ENGINEERING,
        designation: Designation.SOFTWARE_ENGINEER,
        resourceStatus: ResourceStatus.BENCH,
        isActive: true,
      },
    ]);
    allocationRepository.getCurrentUtilizationPercent.mockResolvedValue(0);
    allocationRepository.listActiveViewsByResourceProfile.mockResolvedValue([]);
    resourceProfileRepository.listSkills.mockResolvedValue([]);
    timesheetRepository.listRecentActivityTags.mockResolvedValue([]);

    llm.complete.mockResolvedValue(
      JSON.stringify({
        roles: [
          {
            roleTitle: 'Role A',
            status: TeamBuilderConstants.STATUS_FILLED,
            requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
            assignedEmployeeName: 'Priya Sharma',
          },
          {
            roleTitle: 'Role B',
            status: TeamBuilderConstants.STATUS_FILLED,
            requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
            assignedEmployeeName: 'Priya Sharma',
          },
        ],
      }),
    );

    const result = await service.buildTeam('duplicate team');

    expect(result.roles).toHaveLength(2);
    expect(result.roles[0].status).toBe(TeamBuilderConstants.STATUS_FILLED);
    expect(result.roles[1].status).toBe(TeamBuilderConstants.STATUS_GAP);
    expect(result.roles[1].gap?.reasonType).toBe(TeamBuilderConstants.GAP_NO_SKILL);
  });
});
