import { MilestoneStatus } from '@prisma/client';
import { IAllocationRepository } from '../../../domain/interfaces/IAllocationRepository';
import { IProjectRepository } from '../../../domain/interfaces/IProjectRepository';
import { ISystemConfigRepository } from '../../../domain/interfaces/ISystemConfigRepository';
import { ITimesheetRepository } from '../../../domain/interfaces/ITimesheetRepository';
import { ProjectHealthService } from '../../services/ProjectHealthService';

describe('ProjectHealthService', () => {
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

  const timesheetRepository: jest.Mocked<ITimesheetRepository> = {
    findByResourceProfileAndWeek: jest.fn(),
    createWithEntries: jest.fn(),
    createMissedTimesheet: jest.fn(),
    listHistoryByResourceProfile: jest.fn(),
    listRecentActivityTags: jest.fn(),
    listTeamEntriesForWeek: jest.fn(),
    listProjectHoursByResourceProfileForWeek: jest.fn(),
  };

  const systemConfigRepository: jest.Mocked<ISystemConfigRepository> = {
    get: jest.fn(),
    getLlmRuntimeConfig: jest.fn(),
    update: jest.fn(),
  };

  const service = new ProjectHealthService(
    projectRepository,
    allocationRepository,
    timesheetRepository,
    systemConfigRepository,
  );

  const priorWeekStart = new Date('2026-06-01T00:00:00.000Z');
  const priorWeekEnd = new Date('2026-06-07T00:00:00.000Z');
  const referenceDate = new Date('2026-06-10T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    systemConfigRepository.get.mockResolvedValue({
      llmProvider: 'GEMINI',
      llmApiKeyMasked: '****',
      llmBaseUrl: null,
      llmModel: null,
      schedulerIntervalHours: 4,
      maxWeeklyHours: 40,
    } as never);
  });

  it('returns AT_RISK when a milestone is overdue and still IN_PROGRESS', () => {
    const result = service.buildEvaluation({
      milestones: [
        {
          id: 1,
          projectId: 7,
          title: 'API Integration',
          dueDate: '2026-06-05',
          status: MilestoneStatus.IN_PROGRESS,
          storyPoints: 20,
          sortOrder: 1,
        },
      ],
      allocations: [],
      loggedHours: [],
      maxWeeklyHours: 40,
      priorWeekStart,
      priorWeekEnd,
      referenceDate,
    });

    expect(result.healthStatus).toBe('AT_RISK');
    expect(result.riskFlags[0]?.type).toBe('OVERDUE_MILESTONE');
  });

  it('returns ATTENTION when a milestone is due soon and NOT_STARTED', () => {
    const result = service.buildEvaluation({
      milestones: [
        {
          id: 2,
          projectId: 7,
          title: 'UAT',
          dueDate: '2026-06-14',
          status: MilestoneStatus.NOT_STARTED,
          storyPoints: 10,
          sortOrder: 1,
        },
      ],
      allocations: [],
      loggedHours: [],
      maxWeeklyHours: 40,
      priorWeekStart,
      priorWeekEnd,
      referenceDate,
    });

    expect(result.healthStatus).toBe('ATTENTION');
    expect(result.riskFlags[0]?.type).toBe('MILESTONE_DUE_SOON');
  });

  it('returns AT_RISK when logged hours are below 50% of expected', () => {
    const result = service.buildEvaluation({
      milestones: [],
      allocations: [
        {
          resourceProfileId: 3,
          employeeName: 'Riya Patel',
          utilizationPercent: 50,
        },
      ],
      loggedHours: [{ resourceProfileId: 3, employeeName: 'Riya Patel', hours: 8 }],
      maxWeeklyHours: 40,
      priorWeekStart,
      priorWeekEnd,
      referenceDate,
    });

    expect(result.healthStatus).toBe('AT_RISK');
    expect(result.riskFlags[0]?.type).toBe('LOW_HOURS');
  });

  it('returns ATTENTION when logged hours are between 50% and 80% of expected', () => {
    const result = service.buildEvaluation({
      milestones: [],
      allocations: [
        {
          resourceProfileId: 3,
          employeeName: 'Riya Patel',
          utilizationPercent: 50,
        },
      ],
      loggedHours: [{ resourceProfileId: 3, employeeName: 'Riya Patel', hours: 15 }],
      maxWeeklyHours: 40,
      priorWeekStart,
      priorWeekEnd,
      referenceDate,
    });

    expect(result.healthStatus).toBe('ATTENTION');
    expect(result.riskFlags[0]?.type).toBe('PARTIAL_HOURS');
  });

  it('returns ON_TRACK when milestones and hours are healthy', () => {
    const result = service.buildEvaluation({
      milestones: [
        {
          id: 3,
          projectId: 7,
          title: 'Release',
          dueDate: '2026-07-01',
          status: MilestoneStatus.IN_PROGRESS,
          storyPoints: 30,
          sortOrder: 1,
        },
      ],
      allocations: [
        {
          resourceProfileId: 3,
          employeeName: 'Riya Patel',
          utilizationPercent: 50,
        },
      ],
      loggedHours: [{ resourceProfileId: 3, employeeName: 'Riya Patel', hours: 20 }],
      maxWeeklyHours: 40,
      priorWeekStart,
      priorWeekEnd,
      referenceDate,
    });

    expect(result.healthStatus).toBe('ON_TRACK');
    expect(result.riskFlags).toHaveLength(0);
  });

  it('prefers AT_RISK over ATTENTION when both conditions exist', () => {
    const result = service.buildEvaluation({
      milestones: [
        {
          id: 4,
          projectId: 7,
          title: 'UAT',
          dueDate: '2026-06-14',
          status: MilestoneStatus.NOT_STARTED,
          storyPoints: 10,
          sortOrder: 1,
        },
      ],
      allocations: [
        {
          resourceProfileId: 3,
          employeeName: 'Riya Patel',
          utilizationPercent: 50,
        },
      ],
      loggedHours: [{ resourceProfileId: 3, employeeName: 'Riya Patel', hours: 5 }],
      maxWeeklyHours: 40,
      priorWeekStart,
      priorWeekEnd,
      referenceDate,
    });

    expect(result.healthStatus).toBe('AT_RISK');
    expect(result.riskFlags.map((flag) => flag.type)).toEqual(
      expect.arrayContaining(['MILESTONE_DUE_SOON', 'LOW_HOURS']),
    );
  });
});
