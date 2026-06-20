import { ResourceStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { appLogger } from '../../shared/logger/appLogger';

export class EmployeeStatusService {
  constructor(
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly allocationRepository: IAllocationRepository,
  ) {}

  async recomputeStatus(resourceProfileId: number, asOfDate: Date): Promise<ResourceStatus> {
    const activeAllocations = await this.allocationRepository.listActiveByResourceProfile(
      resourceProfileId,
      asOfDate,
    );

    const status =
      activeAllocations.length > 0 ? ResourceStatus.ALLOCATED : ResourceStatus.BENCH;

    await this.resourceProfileRepository.updateResourceStatus(resourceProfileId, status);

    appLogger.info('Resource status recomputed', {
      resourceProfileId,
      status,
      activeAllocationCount: activeAllocations.length,
    });

    return status;
  }
}
