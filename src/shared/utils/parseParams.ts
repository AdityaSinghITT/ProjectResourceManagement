import { ErrorTitles, HttpStatus } from '../constants/httpStatusCodes';
import { ValidationMessages } from '../constants/validationMessages';
import { AppError } from '../errors/AppError';

export function parsePositiveIntParam(value: string | string[], fieldName: string): number {
  const normalized = (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
  const parsed = Number.parseInt(normalized, 10);

  if (Number.isNaN(parsed) || parsed <= 0 || String(parsed) !== normalized) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      ValidationMessages.INVALID_POSITIVE_INTEGER(fieldName, normalized || 'empty'),
      ErrorTitles.BAD_REQUEST,
    );
  }

  return parsed;
}
