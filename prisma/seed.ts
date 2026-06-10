import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient, LlmProvider, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const ACTIVITY_TAGS = [
  'Backend API Development',
  'Microservices / Architecture',
  'Database Design & Queries',
  'WebSocket / Real-time Features',
  'Frontend Development',
  'Code Review / Mentoring',
  'Bug Fixing',
  'DevOps / Deployment',
  'Testing & QA',
  'Documentation',
  'Other',
];

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'Admin@1234';
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(): Promise<void> {
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      if (attempt === RETRY_COUNT) {
        throw error;
      }
      console.log(`Database not reachable (attempt ${attempt}/${RETRY_COUNT}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await delay(RETRY_DELAY_MS);
    }
  }
}

async function main(): Promise<void> {
  console.log('Starting seed...');
  await connectWithRetry();

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { username: DEFAULT_ADMIN_USERNAME },
    update: {
      passwordHash,
      forcePasswordChange: true,
      isActive: true,
    },
    create: {
      username: DEFAULT_ADMIN_USERNAME,
      email: 'admin@techserve.local',
      passwordHash,
      fullName: 'System Administrator',
      role: Role.ADMIN,
      isActive: true,
      forcePasswordChange: true,
    },
  });

  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      llmProvider: LlmProvider.GEMINI,
      llmApiKey: null,
      schedulerIntervalHours: 4,
      maxWeeklyHours: 40,
    },
  });

  for (let i = 0; i < ACTIVITY_TAGS.length; i++) {
    const name = ACTIVITY_TAGS[i];
    await prisma.activityTag.upsert({
      where: { name },
      update: { sortOrder: i + 1 },
      create: { name, sortOrder: i + 1 },
    });
  }

  console.log('Seed completed.');
  console.log(`  Admin user: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD} (change on first login)`);
  console.log(`  Activity tags: ${ACTIVITY_TAGS.length}`);
  console.log('  System config: defaults applied');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
