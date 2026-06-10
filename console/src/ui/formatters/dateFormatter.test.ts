import {
  formatApiDateForDisplay,
  getLastMondayApiDate,
  parseDisplayDateToApi,
  parseWeekStartInput,
} from './dateFormatter';

describe('dateFormatter', () => {
  it('converts API date to DD-MM-YYYY display format', () => {
    expect(formatApiDateForDisplay('2026-06-08')).toBe('08-06-2026');
  });

  it('converts display date to API format', () => {
    expect(parseDisplayDateToApi('08-06-2026')).toBe('2026-06-08');
  });

  it('returns current week Monday when week input is empty', () => {
    const reference = new Date('2026-06-10T12:00:00.000Z');
    expect(getLastMondayApiDate(reference)).toBe('2026-06-08');
  });

  it('accepts API format in parseWeekStartInput', () => {
    expect(parseWeekStartInput('2026-06-08')).toBe('2026-06-08');
  });

  it('accepts display format in parseWeekStartInput', () => {
    expect(parseWeekStartInput('08-06-2026')).toBe('2026-06-08');
  });
});
