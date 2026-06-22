import { ResourceStatus } from '@prisma/client';
import { IAllocationRepository } from '../../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository } from '../../../domain/interfaces/IResourceProfileRepository';
import { EmployeeStatusService } from '../../services/EmployeeStatusService';

describe('EmployeeStatusService', () => {
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
    findResourceContact: jest.fn(),
    setTimesheetFrozen: jest.fn(),
    listActiveResources: jest.fn(),
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

  const service = new EmployeeStatusService(resourceProfileRepository, allocationRepository);
  const asOfDate = new Date('2026-06-15T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets ALLOCATED when resource has active allocations', async () => {
    allocationRepository.listActiveByResourceProfile.mockResolvedValue([
      { id: 1, utilizationPercent: 50, fromDate: asOfDate, toDate: asOfDate },
    ]);

    const status = await service.recomputeStatus(10, asOfDate);

    expect(status).toBe(ResourceStatus.ALLOCATED);
    expect(resourceProfileRepository.updateResourceStatus).toHaveBeenCalledWith(
      10,
      ResourceStatus.ALLOCATED,
    );
  });

  it('sets BENCH when resource has no active allocations', async () => {
    allocationRepository.listActiveByResourceProfile.mockResolvedValue([]);

    const status = await service.recomputeStatus(10, asOfDate);

    expect(status).toBe(ResourceStatus.BENCH);
    expect(resourceProfileRepository.updateResourceStatus).toHaveBeenCalledWith(
      10,
      ResourceStatus.BENCH,
    );
  });
});
