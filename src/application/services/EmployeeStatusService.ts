import { EmployeeStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';
import { appLogger } from '../../shared/logger/appLogger';

export class EmployeeStatusService {
  constructor(
    private readonly employeeRepository: IEmployeeRepository,
    private readonly allocationRepository: IAllocationRepository,
  ) {}

  async recomputeStatus(employeeId: number, asOfDate: Date): Promise<EmployeeStatus> {
    const activeAllocations = await this.allocationRepository.listActiveByEmployee(
      employeeId,
      asOfDate,
    );

    const status =
      activeAllocations.length > 0 ? EmployeeStatus.ALLOCATED : EmployeeStatus.BENCH;

    await this.employeeRepository.updateStatus(employeeId, status);

    appLogger.info('Employee status recomputed', {
      employeeId,
      status,
      activeAllocationCount: activeAllocations.length,
    });

    return status;
  }
}
