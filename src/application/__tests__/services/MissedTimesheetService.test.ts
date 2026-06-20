import { TimesheetStatus } from '@prisma/client';
import { IAllocationRepository } from '../../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository } from '../../../domain/interfaces/IResourceProfileRepository';
import { ITimesheetRepository } from '../../../domain/interfaces/ITimesheetRepository';
import { MissedTimesheetService } from '../../services/MissedTimesheetService';

describe('MissedTimesheetService', () => {
  const weekStart = new Date('2026-05-26T00:00:00.000Z');

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

  const service = new MissedTimesheetService(
    resourceProfileRepository,
    allocationRepository,
    timesheetRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates MISSED timesheet when allocated but no submission exists', async () => {
    allocationRepository.listOverlappingViewsForResourceProfile.mockResolvedValue([
      {
        id: 1,
        resourceProfileId: 5,
        employeeName: 'Ravi Kumar',
        projectId: 10,
        projectName: 'Alpha Portal',
        utilizationPercent: 50,
        fromDate: '2026-05-01',
        toDate: '2026-06-30',
      },
    ]);
    timesheetRepository.findByResourceProfileAndWeek.mockResolvedValue(null);
    timesheetRepository.createMissedTimesheet.mockResolvedValue({
      id: 99,
      weekStart: '2026-05-26',
      weekEnd: '2026-06-01',
      status: TimesheetStatus.MISSED,
      totalHours: 0,
      entries: [],
    });

    const created = await service.flagMissedForResourceWeek(5, weekStart);

    expect(created).toBe(true);
    expect(timesheetRepository.createMissedTimesheet).toHaveBeenCalledWith({
      resourceProfileId: 5,
      weekStart,
      projectIds: [10],
    });
  });

  it('does not create MISSED when no allocation overlaps the week', async () => {
    allocationRepository.listOverlappingViewsForResourceProfile.mockResolvedValue([]);

    const created = await service.flagMissedForResourceWeek(5, weekStart);

    expect(created).toBe(false);
    expect(timesheetRepository.createMissedTimesheet).not.toHaveBeenCalled();
  });

  it('does not create MISSED when timesheet already exists', async () => {
    allocationRepository.listOverlappingViewsForResourceProfile.mockResolvedValue([
      {
        id: 1,
        resourceProfileId: 5,
        employeeName: 'Ravi Kumar',
        projectId: 10,
        projectName: 'Alpha Portal',
        utilizationPercent: 50,
        fromDate: '2026-05-01',
        toDate: '2026-06-30',
      },
    ]);
    timesheetRepository.findByResourceProfileAndWeek.mockResolvedValue({
      id: 1,
      weekStart: '2026-05-26',
      weekEnd: '2026-06-01',
      status: TimesheetStatus.SUBMITTED,
      totalHours: 40,
      entries: [],
    });

    const created = await service.flagMissedForResourceWeek(5, weekStart);

    expect(created).toBe(false);
    expect(timesheetRepository.createMissedTimesheet).not.toHaveBeenCalled();
  });

  it('sweeps completed weeks for all active resources', async () => {
    resourceProfileRepository.list.mockResolvedValue({
      employees: [{ id: 5, userId: 1, fullName: 'A', department: null, designation: null, status: 'BENCH', isActive: true, managerId: null, managerName: null }],
      summary: { total: 1, allocated: 0, bench: 1 },
    });
    allocationRepository.listOverlappingViewsForResourceProfile.mockResolvedValue([]);

    const result = await service.flagMissedTimesheets(new Date('2026-06-10T00:00:00.000Z'));

    expect(result.scannedResources).toBe(1);
    expect(result.scannedWeeks).toBeGreaterThan(0);
    expect(result.createdCount).toBe(0);
  });
});
