import { EmployeeStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';
import { EmployeeStatusService } from './EmployeeStatusService';

describe('EmployeeStatusService', () => {
  const employeeRepository: jest.Mocked<IEmployeeRepository> = {
    create: jest.fn(),
    assignManager: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    clearReportingManagerForTeam: jest.fn(),
    countTeamMembers: jest.fn(),
    getActiveAllocations: jest.fn(),
    endActiveAllocations: jest.fn(),
    listSkills: jest.fn(),
    addSkill: jest.fn(),
    updateSkill: jest.fn(),
    removeSkill: jest.fn(),
    findEmployeeSkill: jest.fn(),
    updateStatus: jest.fn(),
    findTeamMember: jest.fn(),
    listTeamMembers: jest.fn(),
  };

  const allocationRepository: jest.Mocked<IAllocationRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    endAllocation: jest.fn(),
    listAdmin: jest.fn(),
    listOverlappingForEmployee: jest.fn(),
    listActiveByEmployee: jest.fn(),
    getCurrentUtilizationPercent: jest.fn(),
    listActiveViewsByEmployee: jest.fn(),
    listOverlappingViewsForEmployee: jest.fn(),
    listOverlappingViewsForProject: jest.fn(),
  };

  const service = new EmployeeStatusService(employeeRepository, allocationRepository);
  const asOfDate = new Date('2026-06-15T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets ALLOCATED when employee has active allocations', async () => {
    allocationRepository.listActiveByEmployee.mockResolvedValue([
      { id: 1, utilizationPercent: 50, fromDate: asOfDate, toDate: asOfDate },
    ]);

    const status = await service.recomputeStatus(10, asOfDate);

    expect(status).toBe(EmployeeStatus.ALLOCATED);
    expect(employeeRepository.updateStatus).toHaveBeenCalledWith(10, EmployeeStatus.ALLOCATED);
  });

  it('sets BENCH when employee has no active allocations', async () => {
    allocationRepository.listActiveByEmployee.mockResolvedValue([]);

    const status = await service.recomputeStatus(10, asOfDate);

    expect(status).toBe(EmployeeStatus.BENCH);
    expect(employeeRepository.updateStatus).toHaveBeenCalledWith(10, EmployeeStatus.BENCH);
  });
});
