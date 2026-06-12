import {
  calculateAvailabilityPercent,
  calculateTotalUtilization,
  dateRangesOverlap,
  deriveDashboardStatus,
  isUtilizationValid,
  sumOverlappingUtilization,
} from '../../utils/allocationOverlap.util';

describe('allocationOverlap.util', () => {
  const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

  describe('dateRangesOverlap', () => {
    it('returns true when ranges overlap', () => {
      expect(dateRangesOverlap(day('2026-06-01'), day('2026-06-30'), day('2026-06-15'), day('2026-07-15'))).toBe(
        true,
      );
    });

    it('returns false when ranges do not overlap', () => {
      expect(dateRangesOverlap(day('2026-06-01'), day('2026-06-15'), day('2026-06-16'), day('2026-06-30'))).toBe(
        false,
      );
    });

    it('returns true when ranges share a boundary date', () => {
      expect(dateRangesOverlap(day('2026-06-01'), day('2026-06-15'), day('2026-06-15'), day('2026-06-30'))).toBe(
        true,
      );
    });
  });

  describe('sumOverlappingUtilization', () => {
    const allocations = [
      { id: 1, utilizationPercent: 50, fromDate: day('2026-06-01'), toDate: day('2026-06-30') },
      { id: 2, utilizationPercent: 30, fromDate: day('2026-07-01'), toDate: day('2026-07-31') },
    ];

    it('sums utilization for overlapping allocations only', () => {
      const total = sumOverlappingUtilization(allocations, day('2026-06-10'), day('2026-06-20'));
      expect(total).toBe(50);
    });

    it('excludes a specific allocation when requested', () => {
      const total = sumOverlappingUtilization(
        allocations,
        day('2026-06-10'),
        day('2026-06-20'),
        1,
      );
      expect(total).toBe(0);
    });
  });

  describe('utilization helpers', () => {
    it('calculates total utilization', () => {
      expect(calculateTotalUtilization(50, 50)).toBe(100);
    });

    it('validates utilization at 100% as valid', () => {
      expect(isUtilizationValid(100)).toBe(true);
    });

    it('validates utilization above 100% as invalid', () => {
      expect(isUtilizationValid(110)).toBe(false);
    });

    it('calculates availability percent', () => {
      expect(calculateAvailabilityPercent(60)).toBe(40);
    });
  });

  describe('deriveDashboardStatus', () => {
    it('returns BENCH for zero utilization', () => {
      expect(deriveDashboardStatus(0)).toBe('BENCH');
    });

    it('returns PARTIAL for partial utilization', () => {
      expect(deriveDashboardStatus(50)).toBe('PARTIAL');
    });

    it('returns FULL for 100% utilization', () => {
      expect(deriveDashboardStatus(100)).toBe('FULL');
    });
  });
});
