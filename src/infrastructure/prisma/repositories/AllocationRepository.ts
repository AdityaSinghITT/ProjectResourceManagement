import { Prisma } from '@prisma/client';
import { prisma } from '../client';
import {
  AllocationListResult,
  AllocationView,
  OverlappingAllocationRecord,
} from '../../../domain/types/allocation.types';
import {
  AllocationRecord,
  CreateAllocationInput,
  IAllocationRepository,
} from '../../../domain/interfaces/IAllocationRepository';
import { formatDateOnly, todayDateOnly } from '../../../shared/utils/date.utils';

const allocationInclude = {
  resourceProfile: { include: { user: { select: { fullName: true } } } },
  project: { select: { id: true, name: true, managerId: true } },
} as const;

function mapAllocationView(allocation: {
  id: number;
  resourceProfileId: number;
  projectId: number;
  utilizationPercent: number;
  fromDate: Date;
  toDate: Date;
  resourceProfile: { user: { fullName: string } };
  project: { name: string };
}): AllocationView {
  return {
    id: allocation.id,
    resourceProfileId: allocation.resourceProfileId,
    employeeName: allocation.resourceProfile.user.fullName,
    projectId: allocation.projectId,
    projectName: allocation.project.name,
    utilizationPercent: allocation.utilizationPercent,
    fromDate: formatDateOnly(allocation.fromDate),
    toDate: formatDateOnly(allocation.toDate),
  };
}

function mapOverlappingRecord(allocation: {
  id: number;
  utilizationPercent: number;
  fromDate: Date;
  toDate: Date;
}): OverlappingAllocationRecord {
  return {
    id: allocation.id,
    utilizationPercent: allocation.utilizationPercent,
    fromDate: allocation.fromDate,
    toDate: allocation.toDate,
  };
}

export class PrismaAllocationRepository implements IAllocationRepository {
  async create(input: CreateAllocationInput): Promise<AllocationView> {
    const allocation = await prisma.allocation.create({
      data: {
        resourceProfileId: input.resourceProfileId,
        projectId: input.projectId,
        utilizationPercent: input.utilizationPercent,
        fromDate: input.fromDate,
        toDate: input.toDate,
      },
      include: allocationInclude,
    });

    return mapAllocationView(allocation);
  }

  async findById(allocationId: number): Promise<AllocationRecord | null> {
    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
      include: allocationInclude,
    });

    if (!allocation) {
      return null;
    }

    return {
      ...mapAllocationView(allocation),
      managerId: allocation.project.managerId,
    };
  }

  async endAllocation(allocationId: number, endDate: Date): Promise<AllocationView> {
    const allocation = await prisma.allocation.update({
      where: { id: allocationId },
      data: { toDate: endDate },
      include: allocationInclude,
    });

    return mapAllocationView(allocation);
  }

  async listAdmin(filters: {
    resourceProfileId?: number;
    projectId?: number;
  }): Promise<AllocationListResult> {
    const where: Prisma.AllocationWhereInput = {
      ...(filters.resourceProfileId ? { resourceProfileId: filters.resourceProfileId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
    };

    const allocations = await prisma.allocation.findMany({
      where,
      orderBy: [{ fromDate: 'asc' }, { id: 'asc' }],
      include: allocationInclude,
    });

    const today = todayDateOnly();
    const activeCount = allocations.filter((allocation) => allocation.toDate >= today).length;

    return {
      allocations: allocations.map(mapAllocationView),
      summary: { totalActive: activeCount },
    };
  }

  async listOverlappingForResourceProfile(
    resourceProfileId: number,
    fromDate: Date,
    toDate: Date,
    excludeAllocationId?: number,
  ): Promise<OverlappingAllocationRecord[]> {
    const allocations = await prisma.allocation.findMany({
      where: {
        resourceProfileId,
        fromDate: { lte: toDate },
        toDate: { gte: fromDate },
        ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
      },
      orderBy: { fromDate: 'asc' },
    });

    return allocations.map(mapOverlappingRecord);
  }

  async listActiveByResourceProfile(
    resourceProfileId: number,
    asOfDate: Date,
  ): Promise<OverlappingAllocationRecord[]> {
    const allocations = await prisma.allocation.findMany({
      where: {
        resourceProfileId,
        fromDate: { lte: asOfDate },
        toDate: { gte: asOfDate },
      },
      orderBy: { fromDate: 'asc' },
    });

    return allocations.map(mapOverlappingRecord);
  }

  async getCurrentUtilizationPercent(resourceProfileId: number, asOfDate: Date): Promise<number> {
    const activeAllocations = await this.listActiveByResourceProfile(resourceProfileId, asOfDate);
    return activeAllocations.reduce((sum, allocation) => sum + allocation.utilizationPercent, 0);
  }

  async listActiveViewsByResourceProfile(
    resourceProfileId: number,
    asOfDate: Date,
  ): Promise<AllocationView[]> {
    const allocations = await prisma.allocation.findMany({
      where: {
        resourceProfileId,
        fromDate: { lte: asOfDate },
        toDate: { gte: asOfDate },
      },
      orderBy: { fromDate: 'asc' },
      include: allocationInclude,
    });

    return allocations.map(mapAllocationView);
  }

  async listOverlappingViewsForResourceProfile(
    resourceProfileId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<AllocationView[]> {
    const allocations = await prisma.allocation.findMany({
      where: {
        resourceProfileId,
        fromDate: { lte: toDate },
        toDate: { gte: fromDate },
      },
      orderBy: { fromDate: 'asc' },
      include: allocationInclude,
    });

    return allocations.map(mapAllocationView);
  }

  async listOverlappingViewsForProject(
    projectId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<AllocationView[]> {
    const allocations = await prisma.allocation.findMany({
      where: {
        projectId,
        fromDate: { lte: toDate },
        toDate: { gte: fromDate },
      },
      orderBy: [{ fromDate: 'asc' }, { id: 'asc' }],
      include: allocationInclude,
    });

    return allocations.map(mapAllocationView);
  }
}
