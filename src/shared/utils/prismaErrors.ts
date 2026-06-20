import { Prisma } from '@prisma/client';
import { DATABASE_UNAVAILABLE_PRISMA_CODES } from '../constants/prismaErrorCodes';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
}

export function isDatabaseUnreachableError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if ((DATABASE_UNAVAILABLE_PRISMA_CODES as readonly string[]).includes(err.code)) {
      return true;
    }
  }

  const message = getErrorMessage(err);
  return (
    message.includes("Can't reach database server") ||
    message.includes('Connection reset') ||
    message.includes('terminating connection due to administrator command') ||
    message.includes('server closed the connection unexpectedly')
  );
}
