import {
  AllocationListResult,
  AllocationView,
  OverlappingAllocationRecord,
} from '../types/allocation.types';

export interface CreateAllocationInput {
  employeeId: number;
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
  listAdmin(filters: { employeeId?: number; projectId?: number }): Promise<AllocationListResult>;
  listOverlappingForEmployee(
    employeeId: number,
    fromDate: Date,
    toDate: Date,
    excludeAllocationId?: number,
  ): Promise<OverlappingAllocationRecord[]>;
  listActiveByEmployee(employeeId: number, asOfDate: Date): Promise<OverlappingAllocationRecord[]>;
  getCurrentUtilizationPercent(employeeId: number, asOfDate: Date): Promise<number>;
  listActiveViewsByEmployee(employeeId: number, asOfDate: Date): Promise<AllocationView[]>;
  listOverlappingViewsForEmployee(
    employeeId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<AllocationView[]>;
  listOverlappingViewsForProject(
    projectId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<AllocationView[]>;
}
