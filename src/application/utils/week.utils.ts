import { TimesheetRules } from '../../shared/constants/timesheetRules';
import { TimesheetMessages } from '../../shared/constants/timesheetMessages';
import { formatDateOnly, parseIsoDate, todayDateOnly, toDateOnly } from '../../shared/utils/date.utils';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function getWeekStart(date: Date): Date {
  const normalized = toDateOnly(date);
  const dayOfWeek = normalized.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - TimesheetRules.WEEK_START_DAY;
  return addDays(normalized, -daysFromMonday);
}

export function getWeekEnd(weekStart: Date): Date {
  return addDays(toDateOnly(weekStart), TimesheetRules.DAYS_IN_WEEK - 1);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
  return toDateOnly(result);
}

export function isWeekStartMonday(date: Date): boolean {
  return toDateOnly(date).getUTCDay() === TimesheetRules.WEEK_START_DAY;
}

export function parseWeekStart(dateString: string): Date {
  const parsed = parseIsoDate(dateString);

  if (!isWeekStartMonday(parsed)) {
    throw new Error(TimesheetMessages.INVALID_WEEK_START);
  }

  return parsed;
}

export function isFutureWeek(weekStart: Date): boolean {
  const normalizedWeekStart = toDateOnly(weekStart);
  const currentWeekStart = getWeekStart(todayDateOnly());
  return normalizedWeekStart.getTime() > currentWeekStart.getTime();
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart);
  return `${formatDateOnly(weekStart)} to ${formatDateOnly(weekEnd)}`;
}

export function getRecentWeekStarts(referenceDate: Date, weekCount: number): Date[] {
  const currentWeekStart = getWeekStart(referenceDate);
  return Array.from({ length: weekCount }, (_, index) => addDays(currentWeekStart, -index * 7));
}
