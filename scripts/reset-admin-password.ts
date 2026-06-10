import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'Admin@1234';
const BCRYPT_SALT_ROUNDS = 10;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetAdminPassword(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS);

  await prisma.user.update({
    where: { username: DEFAULT_ADMIN_USERNAME },
    data: {
      passwordHash,
      forcePasswordChange: true,
      isActive: true,
    },
  });

  const user = await prisma.user.findUnique({ where: { username: DEFAULT_ADMIN_USERNAME } });

  if (!user) {
    throw new Error('Admin user not found after update');
  }

  const verified = await bcrypt.compare(DEFAULT_ADMIN_PASSWORD, user.passwordHash);

  if (!verified) {
    throw new Error('Password reset completed but verification failed');
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      await resetAdminPassword(prisma);
      console.log('Admin password reset successful.');
      console.log(`  Username: ${DEFAULT_ADMIN_USERNAME}`);
      console.log(`  Password: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log('  forcePasswordChange: true (change password after login)');
      await prisma.$disconnect();
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${RETRY_COUNT} failed. Retrying in ${RETRY_DELAY_MS / 1000}s...`);

      if (attempt < RETRY_COUNT) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  await prisma.$disconnect();
  console.error('Reset failed after all retries:', lastError);
  console.error('Tip: Check DATABASE_URL in .env and ensure your Neon database is active.');
  process.exit(1);
}

main().catch((error: unknown) => {
  console.error('Reset failed:', error);
  process.exit(1);
});
