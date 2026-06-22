import { Department, Designation, ProjectStatus, ResourceStatus } from '@prisma/client';
import { IAllocationRepository } from '../../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository, TeamMemberRecord } from '../../../domain/interfaces/IResourceProfileRepository';
import { IProjectRepository } from '../../../domain/interfaces/IProjectRepository';
import { AppError } from '../../../shared/errors/AppError';
import { HttpStatus } from '../../../shared/constants/httpStatusCodes';
import { AllocationService } from '../../services/AllocationService';
import { EmployeeStatusService } from '../../services/EmployeeStatusService';

describe('AllocationService', () => {
  const teamMember: TeamMemberRecord = {
    id: 1,
    userId: 5,
    fullName: 'Riya Patel',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    resourceStatus: ResourceStatus.BENCH,
    isActive: true,
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

  const employeeStatusService: jest.Mocked<EmployeeStatusService> = {
    recomputeStatus: jest.fn(),
  } as unknown as jest.Mocked<EmployeeStatusService>;

  const service = new AllocationService(
    allocationRepository,
    resourceProfileRepository,
    projectRepository,
    employeeStatusService,
  );

  const baseRequest = {
    employeeId: 1,
    projectId: 10,
    utilizationPercent: 50,
    fromDate: '2026-06-01',
    toDate: '2026-08-31',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resourceProfileRepository.findTeamMember.mockResolvedValue(teamMember);
    projectRepository.findById.mockResolvedValue({
      id: 10,
      name: 'Portal Revamp',
      description: 'desc',
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      status: ProjectStatus.ACTIVE,
      managerId: 99,
      managerName: 'Manager One',
      totalStoryPoints: 100,
      completedStoryPoints: 0,
    });
  });

  it('returns valid when overlapping utilization stays at 100%', async () => {
    allocationRepository.listOverlappingForResourceProfile.mockResolvedValue([
      {
        id: 2,
        utilizationPercent: 50,
        fromDate: new Date('2026-06-01T00:00:00.000Z'),
        toDate: new Date('2026-07-31T00:00:00.000Z'),
      },
    ]);

    const result = await service.validateAllocation(99, baseRequest);

    expect(result.valid).toBe(true);
    expect(result.totalUtilizationPercent).toBe(100);
    expect(result.message).toContain('✓ Valid');
  });

  it('returns invalid when overlapping utilization exceeds 100%', async () => {
    allocationRepository.listOverlappingForResourceProfile.mockResolvedValue([
      {
        id: 2,
        utilizationPercent: 60,
        fromDate: new Date('2026-06-01T00:00:00.000Z'),
        toDate: new Date('2026-07-31T00:00:00.000Z'),
      },
    ]);

    const result = await service.validateAllocation(99, baseRequest);

    expect(result.valid).toBe(false);
    expect(result.totalUtilizationPercent).toBe(110);
    expect(result.message).toContain('exceeds 100%');
  });

  it('rejects allocation when manager does not own the project', async () => {
    await expect(service.validateAllocation(100, baseRequest)).rejects.toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
    });
  });

  it('creates allocation and recomputes resource status when valid', async () => {
    allocationRepository.listOverlappingForResourceProfile.mockResolvedValue([]);
    allocationRepository.create.mockResolvedValue({
      id: 7,
      resourceProfileId: 1,
      employeeName: 'Riya Patel',
      projectId: 10,
      projectName: 'Portal Revamp',
      utilizationPercent: 50,
      fromDate: '2026-06-01',
      toDate: '2026-08-31',
    });

    const result = await service.createAllocation(99, baseRequest);

    expect(result.allocation.id).toBe(7);
    expect(allocationRepository.create).toHaveBeenCalled();
    expect(employeeStatusService.recomputeStatus).toHaveBeenCalledWith(1, expect.any(Date));
  });

  it('throws when create is attempted with invalid utilization', async () => {
    allocationRepository.listOverlappingForResourceProfile.mockResolvedValue([
      {
        id: 2,
        utilizationPercent: 60,
        fromDate: new Date('2026-06-01T00:00:00.000Z'),
        toDate: new Date('2026-07-31T00:00:00.000Z'),
      },
    ]);

    await expect(service.createAllocation(99, baseRequest)).rejects.toBeInstanceOf(AppError);
    expect(allocationRepository.create).not.toHaveBeenCalled();
  });

  it('rejects end allocation for non-owner manager', async () => {
    allocationRepository.findById.mockResolvedValue({
      id: 7,
      resourceProfileId: 1,
      employeeName: 'Riya Patel',
      projectId: 10,
      projectName: 'Portal Revamp',
      utilizationPercent: 50,
      fromDate: '2026-06-01',
      toDate: '2026-08-31',
      managerId: 99,
    });

    await expect(service.endAllocation(100, 7)).rejects.toMatchObject({
      statusCode: HttpStatus.FORBIDDEN,
    });
  });
});
