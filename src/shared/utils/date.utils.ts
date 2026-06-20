export function parseIsoDate(dateString: string): Date {
  const parsed = new Date(dateString);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD.');
  }

  return toDateOnly(parsed);
}

export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function todayDateOnly(): Date {
  return toDateOnly(new Date());
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}
