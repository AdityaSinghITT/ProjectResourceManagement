/**
 * Send all three notification email types to Mailtrap using isolated notify.* test users.
 * Does NOT email the rest of the organization (avoids Mailtrap rate limits).
 *
 * Usage: npm run email:samples
 */
import dotenv from 'dotenv';
import path from 'path';
import { getNthWorkingDayAfter, isWorkingDay } from '../src/application/utils/workingDay.utils';
import { addDays, getWeekEnd, getWeekStart } from '../src/application/utils/week.utils';
import { prisma } from '../src/infrastructure/prisma/client';
import {
  projectRiskNotificationService,
  timesheetComplianceService,
} from '../src/infrastructure/wiring/notificationWiring';
import { TimesheetEmailSubjects } from '../src/shared/constants/timesheetComplianceConstants';
import { formatDateOnly, todayDateOnly } from '../src/shared/utils/date.utils';
import { seedNotificationTestData } from './seedNotificationTest';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AT_RISK_PROJECT_NAME = 'Notify AT-RISK Project';
const FRESH_USER = 'notify.fresh';
const REMINDER1_USER = 'notify.reminder1';
const MANAGER_USER = 'notify.manager';

const RETRY_COUNT = 5;
const RETRY_DELAY_MS = 5000;

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
      console.log(
        `Database not reachable (attempt ${attempt}/${RETRY_COUNT}). Retrying in ${RETRY_DELAY_MS / 1000}s...`,
      );
      await delay(RETRY_DELAY_MS);
    }
  }
}

async function getResourceProfileId(username: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { resourceProfile: true },
  });

  if (!user?.resourceProfile) {
    throw new Error(`No resource profile for ${username}. Run npm run seed first if needed.`);
  }

  return user.resourceProfile.id;
}

async function clearAtRiskNotificationForProject(projectId: number): Promise<void> {
  await prisma.projectRiskNotification.deleteMany({ where: { projectId } });
}

async function main(): Promise<void> {
  await connectWithRetry();

  console.log('Resetting notify.* test users...\n');
  await seedNotificationTestData();

  const freshProfileId = await getResourceProfileId(FRESH_USER);
  const reminder1ProfileId = await getResourceProfileId(REMINDER1_USER);

  const atRiskProject = await prisma.project.findFirst({
    where: { name: AT_RISK_PROJECT_NAME },
  });
  if (!atRiskProject) {
    throw new Error(`Project "${AT_RISK_PROJECT_NAME}" not found — run npm run seed:notify`);
  }

  await clearAtRiskNotificationForProject(atRiskProject.id);

  const today = todayDateOnly();
  const priorWeekStart = addDays(getWeekStart(today), -7);
  const priorWeekEnd = getWeekEnd(priorWeekStart);
  const reminder1Day = getNthWorkingDayAfter(priorWeekEnd, 1);
  const reminder2Day = getNthWorkingDayAfter(priorWeekEnd, 2);
  const atRiskDay = isWorkingDay(today) ? today : reminder1Day;

  console.log('\n=== Sending 3 sample emails to Mailtrap ===\n');
  console.log(`Prior week: ${formatDateOnly(priorWeekStart)} – ${formatDateOnly(priorWeekEnd)}`);
  console.log(`Simulated Mon (Reminder 1): ${formatDateOnly(reminder1Day)}`);
  console.log(`Simulated Tue (Reminder 2): ${formatDateOnly(reminder2Day)}`);
  console.log(`AT-RISK evaluation date:       ${formatDateOnly(atRiskDay)}\n`);

  console.log(`1/3  Reminder 1 → ${FRESH_USER}@techserve.local`);
  console.log(`     Subject: "${TimesheetEmailSubjects.REMINDER_1}"`);
  const r1 = await timesheetComplianceService.runDailyCompliance(reminder1Day, {
    resourceProfileIds: [freshProfileId],
  });
  console.log(`     Result:`, r1, '\n');

  console.log(`2/3  Reminder 2 → ${REMINDER1_USER}@techserve.local`);
  console.log(`     Subject: "${TimesheetEmailSubjects.REMINDER_2}"`);
  const r2 = await timesheetComplianceService.runDailyCompliance(reminder2Day, {
    resourceProfileIds: [reminder1ProfileId],
  });
  console.log(`     Result:`, r2, '\n');

  console.log(`3/3  AT-RISK → ${MANAGER_USER}@techserve.local`);
  console.log(`     Subject: "${TimesheetEmailSubjects.PROJECT_AT_RISK}: ${AT_RISK_PROJECT_NAME}"`);
  const risk = await projectRiskNotificationService.run(atRiskDay, {
    projectIds: [atRiskProject.id],
  });
  console.log(`     Result:`, risk, '\n');

  console.log('Done. Open Mailtrap inbox — you should see exactly 3 emails.');
  console.log('(Freeze emails are a separate 4th type — run compliance on Wed if needed.)\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
