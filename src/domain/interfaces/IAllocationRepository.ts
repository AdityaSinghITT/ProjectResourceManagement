import {
  AllocationListResult,
  AllocationView,
  OverlappingAllocationRecord,
} from '../types/allocation.types';

export interface CreateAllocationInput {
  resourceProfileId: number;
  projectId: number;
  utilizationPercent: number;
  fromDate: Date;
  toDate: Date;
}

export interface AllocationRecord extends AllocationView {
  managerId: number;
}

export interface IAllocationRepository {
  create(input: CreateAllocationInput): Promise<AllocationView>;
  findById(allocationId: number): Promise<AllocationRecord | null>;
  endAllocation(allocationId: number, endDate: Date): Promise<AllocationView>;
  listAdmin(filters: {
    resourceProfileId?: number;
    projectId?: number;
  }): Promise<AllocationListResult>;
  listOverlappingForResourceProfile(
    resourceProfileId: number,
    fromDate: Date,
    toDate: Date,
    excludeAllocationId?: number,
  ): Promise<OverlappingAllocationRecord[]>;
  listActiveByResourceProfile(
    resourceProfileId: number,
    asOfDate: Date,
  ): Promise<OverlappingAllocationRecord[]>;
  getCurrentUtilizationPercent(resourceProfileId: number, asOfDate: Date): Promise<number>;
  listActiveViewsByResourceProfile(
    resourceProfileId: number,
    asOfDate: Date,
  ): Promise<AllocationView[]>;
  listOverlappingViewsForResourceProfile(
    resourceProfileId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<AllocationView[]>;
  listOverlappingViewsForProject(
    projectId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<AllocationView[]>;
}
