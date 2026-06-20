import { prisma } from './client';

const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkDatabaseConnection(): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_COUNT) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}
