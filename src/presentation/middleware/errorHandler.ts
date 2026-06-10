import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { ErrorMessages } from '../../shared/constants/errorMessages';
import { PrismaErrorCodes } from '../../shared/constants/prismaErrorCodes';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { isDatabaseUnreachableError } from '../../shared/utils/prismaErrors';

export { AppError };

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.error,
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  if (isInvalidJsonBodyError(err)) {
    res.status(HttpStatus.BAD_REQUEST).json({
      error: ErrorTitles.BAD_REQUEST,
      message: ErrorMessages.INVALID_JSON_BODY,
      statusCode: HttpStatus.BAD_REQUEST,
    });
    return;
  }

  if (isDatabaseUnreachableError(err)) {
    res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      error: ErrorTitles.INTERNAL_SERVER_ERROR,
      message: ErrorMessages.DATABASE_UNREACHABLE,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    });
    return;
  }

  const prismaClientMessage = getPrismaClientErrorMessage(err);
  if (prismaClientMessage) {
    res.status(HttpStatus.BAD_REQUEST).json({
      error: ErrorTitles.BAD_REQUEST,
      message: prismaClientMessage,
      statusCode: HttpStatus.BAD_REQUEST,
    });
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', err);
  } else {
    console.error('Unhandled error:', err instanceof Error ? err.message : err);
  }
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: ErrorTitles.INTERNAL_SERVER_ERROR,
    message: ErrorMessages.UNEXPECTED_ERROR,
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  });
}

function isInvalidJsonBodyError(err: unknown): boolean {
  return err instanceof SyntaxError && 'body' in err;
}

function getPrismaClientErrorMessage(err: unknown): string | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  if (err.code === PrismaErrorCodes.UNIQUE_VIOLATION) {
    return ErrorMessages.UNIQUE_CONSTRAINT_VIOLATION;
  }

  if (err.code === PrismaErrorCodes.COLUMN_NOT_FOUND) {
    const column = typeof err.meta?.column === 'string' ? err.meta.column : 'unknown';
    return ErrorMessages.SCHEMA_OUT_OF_DATE(column);
  }

  if (err.code === PrismaErrorCodes.FOREIGN_KEY_VIOLATION) {
    return ErrorMessages.FOREIGN_KEY_VIOLATION;
  }

  return null;
}
