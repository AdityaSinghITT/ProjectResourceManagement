/**
 * Run one timesheet compliance sweep + project risk notification sweep (same as scheduler).
 *
 * Usage:
 *   npm run compliance:run
 *   npx ts-node prisma/runComplianceSweep.ts 2026-06-17
 *   set COMPLIANCE_AS_OF_DATE=2026-06-17 && npm run compliance:run   (Windows)
 */
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '../src/infrastructure/prisma/client';
import {
  projectRiskNotificationService,
  timesheetComplianceService,
} from '../src/infrastructure/wiring/notificationWiring';
import { formatDateOnly, parseIsoDate, todayDateOnly } from '../src/shared/utils/date.utils';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

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

function parseAsOfDate(): Date {
  const flagArg = process.argv.find((arg) => arg.startsWith('--date='));
  if (flagArg) {
    return parseIsoDate(flagArg.slice('--date='.length));
  }

  if (process.env.COMPLIANCE_AS_OF_DATE) {
    return parseIsoDate(process.env.COMPLIANCE_AS_OF_DATE);
  }

  const positional = process.argv[2];
  if (positional && /^\d{4}-\d{2}-\d{2}$/.test(positional)) {
    return parseIsoDate(positional);
  }

  return todayDateOnly();
}

async function main(): Promise<void> {
  await connectWithRetry();

  const asOfDate = parseAsOfDate();
  console.log(`Running compliance sweep for ${formatDateOnly(asOfDate)}...\n`);

  const compliance = await timesheetComplianceService.runDailyCompliance(asOfDate);
  console.log('Timesheet compliance:', compliance);

  const risk = await projectRiskNotificationService.run(asOfDate);
  console.log('Project AT-RISK emails:', risk);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
