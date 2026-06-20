const DISPLAY_DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
const API_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatApiDateForDisplay(apiDate: string): string {
  const match = apiDate.match(API_DATE_PATTERN);
  if (!match) {
    return apiDate;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function parseDisplayDateToApi(displayDate: string): string {
  const trimmed = displayDate.trim();
  const match = trimmed.match(DISPLAY_DATE_PATTERN);
  if (!match) {
    throw new Error('Invalid date. Use DD-MM-YYYY format.');
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function formatNowForHeader(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year}  ${hours}:${minutes}`;
}

export function getLastMondayApiDate(referenceDate: Date = new Date()): string {
  const normalized = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()),
  );
  const dayOfWeek = normalized.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  normalized.setUTCDate(normalized.getUTCDate() - daysFromMonday);
  return normalized.toISOString().split('T')[0];
}

export function parseWeekStartInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return getLastMondayApiDate();
  }

  if (API_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return parseDisplayDateToApi(trimmed);
}
