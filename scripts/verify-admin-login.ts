import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'Admin@1234';

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });

  if (!user) {
    console.error('FAIL: admin user not found in database');
    process.exit(1);
  }

  console.log('User found:', {
    id: user.id,
    username: user.username,
    isActive: user.isActive,
    forcePasswordChange: user.forcePasswordChange,
  });

  const passwordMatches = await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash);
  console.log(`Password "${ADMIN_PASSWORD}" matches hash:`, passwordMatches);

  await prisma.$disconnect();
  process.exit(passwordMatches ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error('Verify failed:', error);
  process.exit(1);
});
