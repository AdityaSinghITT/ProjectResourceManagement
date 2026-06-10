import { Prisma } from '@prisma/client';
import { PrismaErrorCodes } from '../constants/prismaErrorCodes';

export function isDatabaseUnreachableError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === PrismaErrorCodes.CONNECTION_FAILED)
  );
}
