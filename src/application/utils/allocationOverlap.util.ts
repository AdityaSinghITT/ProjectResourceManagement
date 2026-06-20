import { AllocationRules } from '../../shared/constants/allocationRules';
import { OverlappingAllocationRecord } from '../../domain/types/allocation.types';

export function dateRangesOverlap(
  fromA: Date,
  toA: Date,
  fromB: Date,
  toB: Date,
): boolean {
  return fromA <= toB && fromB <= toA;
}

export function sumOverlappingUtilization(
  existingAllocations: OverlappingAllocationRecord[],
  fromDate: Date,
  toDate: Date,
  excludeAllocationId?: number,
): number {
  return existingAllocations
    .filter((allocation) => allocation.id !== excludeAllocationId)
    .filter((allocation) => dateRangesOverlap(allocation.fromDate, allocation.toDate, fromDate, toDate))
    .reduce((sum, allocation) => sum + allocation.utilizationPercent, 0);
}

export function calculateTotalUtilization(
  currentUtilizationPercent: number,
  newUtilizationPercent: number,
): number {
  return currentUtilizationPercent + newUtilizationPercent;
}

export function isUtilizationValid(totalUtilizationPercent: number): boolean {
  return totalUtilizationPercent <= AllocationRules.MAX_UTILIZATION_PERCENT;
}

export function calculateAvailabilityPercent(utilizationPercent: number): number {
  return Math.max(0, AllocationRules.MAX_UTILIZATION_PERCENT - utilizationPercent);
}

export function deriveDashboardStatus(
  utilizationPercent: number,
): 'BENCH' | 'PARTIAL' | 'FULL' {
  if (utilizationPercent <= 0) {
    return 'BENCH';
  }

  if (utilizationPercent >= AllocationRules.MAX_UTILIZATION_PERCENT) {
    return 'FULL';
  }

  return 'PARTIAL';
}
