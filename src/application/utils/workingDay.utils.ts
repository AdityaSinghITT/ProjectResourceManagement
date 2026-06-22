import { toDateOnly } from '../../shared/utils/date.utils';
import { addDays } from './week.utils';

export function isWorkingDay(date: Date): boolean {
  const day = toDateOnly(date).getUTCDay();
  return day >= 1 && day <= 5;
}

export function addWorkingDays(startDate: Date, workingDayCount: number): Date {
  if (workingDayCount <= 0) {
    return toDateOnly(startDate);
  }

  let current = toDateOnly(startDate);
  let remaining = workingDayCount;

  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current)) {
      remaining -= 1;
    }
  }

  return current;
}

export function getNthWorkingDayAfter(anchorDate: Date, n: number): Date {
  return addWorkingDays(anchorDate, n);
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return toDateOnly(left).getTime() === toDateOnly(right).getTime();
}
