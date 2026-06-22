import { getNthWorkingDayAfter, isWorkingDay } from '../../utils/workingDay.utils';
import { parseIsoDate } from '../../../shared/utils/date.utils';

describe('workingDay.utils', () => {
  it('treats Monday through Friday as working days', () => {
    expect(isWorkingDay(parseIsoDate('2026-06-08'))).toBe(true);
    expect(isWorkingDay(parseIsoDate('2026-06-12'))).toBe(true);
    expect(isWorkingDay(parseIsoDate('2026-06-13'))).toBe(false);
    expect(isWorkingDay(parseIsoDate('2026-06-14'))).toBe(false);
  });

  it('counts working days after prior week Sunday deadline', () => {
    const sundayDeadline = parseIsoDate('2026-06-07');
    expect(getNthWorkingDayAfter(sundayDeadline, 1).toISOString().slice(0, 10)).toBe('2026-06-08');
    expect(getNthWorkingDayAfter(sundayDeadline, 2).toISOString().slice(0, 10)).toBe('2026-06-09');
    expect(getNthWorkingDayAfter(sundayDeadline, 3).toISOString().slice(0, 10)).toBe('2026-06-10');
  });
});
