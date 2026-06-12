import { ProjectStatus } from '@prisma/client';
import { IAllocationRepository } from '../../../domain/interfaces/IAllocationRepository';
import { IProjectRepository } from '../../../domain/interfaces/IProjectRepository';
import { AppError } from '../../../shared/errors/AppError';
import { HttpStatus } from '../../../shared/constants/httpStatusCodes';
import { ManagerMessages } from '../../../shared/constants/managerMessages';
import { ProjectHealthService } from '../../services/ProjectHealthService';
import { ManagerProjectService } from '../../services/ManagerProjectService';

describe('ManagerProjectService', () => {
  const projectRepository: jest.Mocked<IProjectRepository> = {
    create: jest.fn(),
    list: jest.fn(),
    listByManager: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    holdActiveProjectsByManager: jest.fn(),
    countManagedActiveProjects: jest.fn(),
    listMilestones: jest.fn(),
    createMilestone: jest.fn(),
    findMilestone: jest.fn(),
    updateMilestone: jest.fn(),
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

  const projectHealthService = {
    evaluateProject: jest.fn(),
    getPriorCompletedWeekStart: jest.fn(),
    buildEvaluation: jest.fn(),
  } as unknown as jest.Mocked<ProjectHealthService>;

  const service = new ManagerProjectService(
    projectRepository,
    allocationRepository,
    projectHealthService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only projects for the logged-in manager with health summary counts', async () => {
    projectRepository.listByManager.mockResolvedValue([
      {
        id: 1,
        name: 'Portal Revamp',
        description: 'desc',
        startDate: '2026-06-01',
        endDate: '2026-12-31',
        status: ProjectStatus.ACTIVE,
        managerId: 22,
        managerName: 'Manager One',
        totalStoryPoints: 100,
        completedStoryPoints: 20,
      },
      {
        id: 2,
        name: 'Mobile App',
        description: 'desc',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        status: ProjectStatus.PLANNED,
        managerId: 22,
        managerName: 'Manager One',
        totalStoryPoints: 50,
        completedStoryPoints: 0,
      },
    ]);

    projectHealthService.evaluateProject
      .mockResolvedValueOnce({
        healthStatus: 'ON_TRACK',
        riskFlags: [],
        evaluatedWeekStart: '2026-06-01',
        evaluatedWeekEnd: '2026-06-07',
      })
      .mockResolvedValueOnce({
        healthStatus: 'AT_RISK',
        riskFlags: [],
        evaluatedWeekStart: '2026-06-01',
        evaluatedWeekEnd: '2026-06-07',
      });

    const result = await service.listProjects(22);

    expect(projectRepository.listByManager).toHaveBeenCalledWith(22);
    expect(result.projects).toHaveLength(2);
    expect(result.projects[0]?.healthStatus).toBe('ON_TRACK');
    expect(result.projects[1]?.healthStatus).toBe('AT_RISK');
    expect(result.summary).toEqual({
      total: 2,
      planned: 1,
      active: 1,
      onHold: 0,
      onTrack: 1,
      attention: 0,
      atRisk: 1,
    });
  });

  it('returns project detail for owned project', async () => {
    projectRepository.findById.mockResolvedValue({
      id: 7,
      name: 'Dark Knight',
      description: 'desc',
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      status: ProjectStatus.ACTIVE,
      managerId: 22,
      managerName: 'Manager One',
      totalStoryPoints: 100,
      completedStoryPoints: 20,
    });
    projectRepository.listMilestones.mockResolvedValue({
      milestones: [],
      summary: {
        totalStoryPoints: 0,
        completedStoryPoints: 0,
        remainingStoryPoints: 0,
      },
    });
    allocationRepository.listOverlappingViewsForProject.mockResolvedValue([]);
    projectHealthService.evaluateProject.mockResolvedValue({
      healthStatus: 'ATTENTION',
      riskFlags: [
        {
          type: 'PARTIAL_HOURS',
          message: 'Riya Patel logged 15/20 expected hours last week (50–80%)',
          employeeId: 3,
        },
      ],
      evaluatedWeekStart: '2026-06-01',
      evaluatedWeekEnd: '2026-06-07',
    });

    const result = await service.getProjectDetail(22, 7);

    expect(result.project.healthStatus).toBe('ATTENTION');
    expect(result.health.riskFlags).toHaveLength(1);
    expect(result.allocations).toEqual([]);
  });

  it('rejects project detail when manager does not own the project', async () => {
    projectRepository.findById.mockResolvedValue({
      id: 7,
      name: 'Dark Knight',
      description: 'desc',
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      status: ProjectStatus.ACTIVE,
      managerId: 99,
      managerName: 'Other Manager',
      totalStoryPoints: 100,
      completedStoryPoints: 20,
    });

    await expect(service.getProjectDetail(22, 7)).rejects.toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
      message: ManagerMessages.PROJECT_NOT_OWNED,
    });
  });

  it('returns 404 when project does not exist', async () => {
    projectRepository.findById.mockResolvedValue(null);

    await expect(service.getProjectDetail(22, 7)).rejects.toBeInstanceOf(AppError);
  });
});
