import { todayDateOnly } from '../../shared/utils/date.utils';
import {
  addDays,
  formatWeekRange,
  getRecentWeekStarts,
  getWeekEnd,
  getWeekStart,
  isFutureWeek,
  isWeekStartMonday,
  parseWeekStart,
} from './week.utils';

describe('week.utils', () => {
  const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

  describe('getWeekStart', () => {
    it('returns Monday when given a Wednesday', () => {
      expect(getWeekStart(day('2026-06-03')).toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });

    it('returns same Monday when given a Monday', () => {
      expect(getWeekStart(day('2026-06-01')).toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });

    it('returns previous Monday when given a Sunday', () => {
      expect(getWeekStart(day('2026-06-07')).toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });
  });

  describe('getWeekEnd', () => {
    it('returns Sunday for a Monday week start', () => {
      expect(getWeekEnd(day('2026-06-01')).toISOString()).toBe('2026-06-07T00:00:00.000Z');
    });
  });

  describe('parseWeekStart', () => {
    it('accepts a Monday date string', () => {
      expect(parseWeekStart('2026-06-01').toISOString()).toBe('2026-06-01T00:00:00.000Z');
    });

    it('rejects a non-Monday date string', () => {
      expect(() => parseWeekStart('2026-06-03')).toThrow(/Monday/);
    });
  });

  describe('isWeekStartMonday', () => {
    it('returns true only for Monday', () => {
      expect(isWeekStartMonday(day('2026-06-01'))).toBe(true);
      expect(isWeekStartMonday(day('2026-06-02'))).toBe(false);
    });
  });

  describe('isFutureWeek', () => {
    it('returns true for a week after the current week', () => {
      const nextWeek = addDays(getWeekStart(todayDateOnly()), 7);
      expect(isFutureWeek(nextWeek)).toBe(true);
    });

    it('returns false for the current week', () => {
      expect(isFutureWeek(getWeekStart(todayDateOnly()))).toBe(false);
    });
  });

  describe('formatWeekRange', () => {
    it('formats Monday to Sunday range', () => {
      expect(formatWeekRange(day('2026-06-01'))).toBe('2026-06-01 to 2026-06-07');
    });
  });

  describe('getRecentWeekStarts', () => {
    it('returns consecutive Mondays ending at the reference week', () => {
      const weeks = getRecentWeekStarts(day('2026-06-03'), 3);
      expect(weeks.map((week) => week.toISOString())).toEqual([
        '2026-06-01T00:00:00.000Z',
        '2026-05-25T00:00:00.000Z',
        '2026-05-18T00:00:00.000Z',
      ]);
    });
  });
});
