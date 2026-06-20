import { ZodSchema } from 'zod';
import { ErrorTitles, HttpStatus } from '../constants/httpStatusCodes';
import { ValidationMessages } from '../constants/validationMessages';
import { AppError } from '../errors/AppError';

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      result.error.issues[0]?.message ?? ValidationMessages.INVALID_REQUEST_BODY,
      ErrorTitles.BAD_REQUEST,
    );
  }

  return result.data;
}
