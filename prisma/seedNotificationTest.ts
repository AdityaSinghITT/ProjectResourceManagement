/**
 * Isolated notification-milestone test data (does not modify existing demo users).
 * Run: npm run seed:notify
 */
import dotenv from 'dotenv';
import path from 'path';
import {
  Department,
  Designation,
  MilestoneStatus,
  PrismaClient,
  ProjectStatus,
  TimesheetComplianceState,
  TimesheetStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { getNthWorkingDayAfter } from '../src/application/utils/workingDay.utils';
import { addDays, getWeekEnd, getWeekStart } from '../src/application/utils/week.utils';
import { PrismaAuthorizationRepository } from '../src/infrastructure/prisma/repositories/AuthorizationRepository';
import { RoleNames } from '../src/shared/constants/roleNames';
import { formatDateOnly, todayDateOnly } from '../src/shared/utils/date.utils';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const authorizationRepository = new PrismaAuthorizationRepository();

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

export const NOTIFY_TEST_PASSWORD = 'Notify@1234';

const MANAGER = {
  username: 'notify.manager',
  email: 'notify.manager@techserve.local',
  fullName: 'Notify Test Manager',
};

const PROJECT_NAMES = {
  main: 'Notify Test Project',
  atRisk: 'Notify AT-RISK Project',
} as const;

const RESOURCES = {
  fresh: {
    username: 'notify.fresh',
    email: 'notify.fresh@techserve.local',
    fullName: 'Notify Fresh Miss',
  },
  reminder1: {
    username: 'notify.reminder1',
    email: 'notify.reminder1@techserve.local',
    fullName: 'Notify After Reminder1',
  },
  reminder2: {
    username: 'notify.reminder2',
    email: 'notify.reminder2@techserve.local',
    fullName: 'Notify After Reminder2',
  },
  frozen: {
    username: 'notify.frozen',
    email: 'notify.frozen@techserve.local',
    fullName: 'Notify Frozen Ready',
  },
  submitted: {
    username: 'notify.submitted',
    email: 'notify.submitted@techserve.local',
    fullName: 'Notify Submitted OK',
  },
  noop: {
    username: 'notify.noop',
    email: 'notify.noop@techserve.local',
    fullName: 'Notify No Prior Alloc',
  },
} as const;

async function upsertUser(
  username: string,
  email: string,
  fullName: string,
  password: string,
  roleName: typeof RoleNames.MANAGER | typeof RoleNames.RESOURCE,
  options?: { department?: Department; designation?: Designation },
): Promise<{ userId: number; resourceProfileId?: number }> {
  const role = await prisma.role.findUniqueOrThrow({ where: { roleName: roleName } });
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      email,
      fullName,
      passwordHash,
      department: options?.department ?? Department.ENGINEERING,
      designation: options?.designation ?? Designation.SOFTWARE_ENGINEER,
      isActive: true,
      forcePasswordChange: false,
    },
    create: {
      username,
      email,
      fullName,
      passwordHash,
      department: options?.department ?? Department.ENGINEERING,
      designation: options?.designation ?? Designation.SOFTWARE_ENGINEER,
      isActive: true,
      forcePasswordChange: false,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: { isPrimary: true },
    create: { userId: user.id, roleId: role.id, isPrimary: true },
  });

  if (roleName === RoleNames.MANAGER) {
    return { userId: user.id };
  }

  const profile = await prisma.resourceProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return { userId: user.id, resourceProfileId: profile.id };
}

async function upsertProject(
  name: string,
  managerUserId: number,
  options: { atRisk?: boolean },
): Promise<number> {
  const today = todayDateOnly();
  const existing = await prisma.project.findFirst({ where: { name } });

  const baseData = {
    description: `Notification test project: ${name}`,
    startDate: addDays(today, -90),
    endDate: addDays(today, 180),
    status: ProjectStatus.ACTIVE,
    managerId: managerUserId,
    totalStoryPoints: 100,
  };

  if (existing) {
    await prisma.project.update({ where: { id: existing.id }, data: baseData });
    if (options.atRisk) {
      await prisma.milestone.deleteMany({ where: { projectId: existing.id } });
      await prisma.milestone.create({
        data: {
          projectId: existing.id,
          title: 'Overdue Notify Milestone',
          dueDate: addDays(today, -14),
          status: MilestoneStatus.IN_PROGRESS,
          storyPoints: 40,
          sortOrder: 1,
        },
      });
    }
    return existing.id;
  }

  const project = await prisma.project.create({
    data: {
      name,
      ...baseData,
      milestones: options.atRisk
        ? {
            create: {
              title: 'Overdue Notify Milestone',
              dueDate: addDays(today, -14),
              status: MilestoneStatus.IN_PROGRESS,
              storyPoints: 40,
              sortOrder: 1,
            },
          }
        : undefined,
    },
  });

  return project.id;
}

async function upsertAllocation(
  resourceProfileId: number,
  projectId: number,
  fromDate: Date,
  toDate: Date,
): Promise<void> {
  const existing = await prisma.allocation.findFirst({
    where: { resourceProfileId, projectId },
  });

  if (existing) {
    await prisma.allocation.update({
      where: { id: existing.id },
      data: { utilizationPercent: 100, fromDate, toDate },
    });
    return;
  }

  await prisma.allocation.create({
    data: {
      resourceProfileId,
      projectId,
      utilizationPercent: 100,
      fromDate,
      toDate,
    },
  });
}

async function clearWeekState(resourceProfileId: number, weekStart: Date): Promise<void> {
  await prisma.timesheetComplianceCase.deleteMany({
    where: { resourceProfileId, weekStart },
  });
  await prisma.timesheet.deleteMany({
    where: { resourceProfileId, weekStart },
  });
}

async function createPlaceholderTimesheet(
  resourceProfileId: number,
  weekStart: Date,
  projectId: number,
  status: TimesheetStatus,
): Promise<void> {
  await prisma.timesheet.create({
    data: {
      resourceProfileId,
      weekStart,
      status,
      entries: {
        create: [{ projectId, hours: status === TimesheetStatus.SUBMITTED ? 40 : 0 }],
      },
    },
  });
}

async function upsertComplianceCase(
  resourceProfileId: number,
  weekStart: Date,
  state: TimesheetComplianceState,
  timestamps: {
    reminder1SentAt?: Date | null;
    reminder2SentAt?: Date | null;
    frozenAt?: Date | null;
  },
): Promise<void> {
  await prisma.timesheetComplianceCase.upsert({
    where: {
      resourceProfileId_weekStart: { resourceProfileId, weekStart },
    },
    create: {
      resourceProfileId,
      weekStart,
      state,
      reminder1SentAt: timestamps.reminder1SentAt ?? null,
      reminder2SentAt: timestamps.reminder2SentAt ?? null,
      frozenAt: timestamps.frozenAt ?? null,
    },
    update: {
      state,
      reminder1SentAt: timestamps.reminder1SentAt ?? null,
      reminder2SentAt: timestamps.reminder2SentAt ?? null,
      frozenAt: timestamps.frozenAt ?? null,
    },
  });
}

function describeTodayAction(
  today: Date,
  priorWeekEnd: Date,
): 'REMINDER_1' | 'REMINDER_2' | 'FREEZE' | 'NONE' {
  if (getNthWorkingDayAfter(priorWeekEnd, 1).getTime() === today.getTime()) {
    return 'REMINDER_1';
  }
  if (getNthWorkingDayAfter(priorWeekEnd, 2).getTime() === today.getTime()) {
    return 'REMINDER_2';
  }
  if (getNthWorkingDayAfter(priorWeekEnd, 3).getTime() === today.getTime()) {
    return 'FREEZE';
  }
  return 'NONE';
}

export async function seedNotificationTestData(): Promise<void> {
  await authorizationRepository.ensureRolesAndPermissions();

  const today = todayDateOnly();
  const currentWeekStart = getWeekStart(today);
  const priorWeekStart = addDays(currentWeekStart, -7);
  const priorWeekEnd = getWeekEnd(priorWeekStart);
  const longAllocStart = addDays(priorWeekStart, -21);
  const longAllocEnd = addDays(getWeekEnd(currentWeekStart), 90);

  const manager = await upsertUser(
    MANAGER.username,
    MANAGER.email,
    MANAGER.fullName,
    NOTIFY_TEST_PASSWORD,
    RoleNames.MANAGER,
    {
      department: Department.ENGINEERING,
      designation: Designation.PROJECT_MANAGER,
    },
  );

  const mainProjectId = await upsertProject(PROJECT_NAMES.main, manager.userId, { atRisk: false });
  await upsertProject(PROJECT_NAMES.atRisk, manager.userId, { atRisk: true });

  const profiles = new Map<string, number>();

  for (const [key, resource] of Object.entries(RESOURCES)) {
    const seeded = await upsertUser(
      resource.username,
      resource.email,
      resource.fullName,
      NOTIFY_TEST_PASSWORD,
      RoleNames.RESOURCE,
    );
    if (!seeded.resourceProfileId) {
      throw new Error(`Missing profile for ${resource.username}`);
    }

    await prisma.resourceProfile.update({
      where: { id: seeded.resourceProfileId },
      data: {
        managerId: manager.userId,
        resourceStatus: 'ALLOCATED',
        timesheetSubmissionFrozen: false,
        timesheetFrozenAt: null,
        timesheetFrozenForWeekStart: null,
      },
    });

    profiles.set(key, seeded.resourceProfileId);
  }

  for (const key of ['fresh', 'reminder1', 'reminder2', 'frozen', 'submitted'] as const) {
    const profileId = profiles.get(key)!;
    await upsertAllocation(profileId, mainProjectId, longAllocStart, longAllocEnd);
  }

  const noopProfileId = profiles.get('noop')!;
  await upsertAllocation(noopProfileId, mainProjectId, currentWeekStart, longAllocEnd);

  const activityTag = await prisma.activityTag.findFirst();
  if (!activityTag) {
    throw new Error('No activity tags found — run main seed first (npm run seed)');
  }

  for (const profileId of profiles.values()) {
    await clearWeekState(profileId, priorWeekStart);
  }

  const freshId = profiles.get('fresh')!;
  // No timesheet, no compliance — scheduler creates Reminder 1 / 2 / Freeze based on today.

  const reminder1Id = profiles.get('reminder1')!;
  await createPlaceholderTimesheet(reminder1Id, priorWeekStart, mainProjectId, TimesheetStatus.PENDING);
  await upsertComplianceCase(reminder1Id, priorWeekStart, TimesheetComplianceState.REMINDER_1_SENT, {
    reminder1SentAt: getNthWorkingDayAfter(priorWeekEnd, 1),
  });

  const reminder2Id = profiles.get('reminder2')!;
  await createPlaceholderTimesheet(reminder2Id, priorWeekStart, mainProjectId, TimesheetStatus.PENDING);
  await upsertComplianceCase(reminder2Id, priorWeekStart, TimesheetComplianceState.REMINDER_2_SENT, {
    reminder1SentAt: getNthWorkingDayAfter(priorWeekEnd, 1),
    reminder2SentAt: getNthWorkingDayAfter(priorWeekEnd, 2),
  });

  const frozenId = profiles.get('frozen')!;
  await createPlaceholderTimesheet(frozenId, priorWeekStart, mainProjectId, TimesheetStatus.MISSED);
  await upsertComplianceCase(frozenId, priorWeekStart, TimesheetComplianceState.FROZEN, {
    reminder1SentAt: getNthWorkingDayAfter(priorWeekEnd, 1),
    reminder2SentAt: getNthWorkingDayAfter(priorWeekEnd, 2),
    frozenAt: getNthWorkingDayAfter(priorWeekEnd, 3),
  });
  await prisma.resourceProfile.update({
    where: { id: frozenId },
    data: {
      timesheetSubmissionFrozen: true,
      timesheetFrozenAt: getNthWorkingDayAfter(priorWeekEnd, 3),
      timesheetFrozenForWeekStart: priorWeekStart,
    },
  });

  const submittedId = profiles.get('submitted')!;
  const submittedTimesheet = await prisma.timesheet.create({
    data: {
      resourceProfileId: submittedId,
      weekStart: priorWeekStart,
      status: TimesheetStatus.SUBMITTED,
      entries: {
        create: [
          {
            projectId: mainProjectId,
            hours: 40,
            tags: { create: [{ activityTagId: activityTag.id }] },
          },
        ],
      },
    },
  });
  void submittedTimesheet;

  const todayAction = describeTodayAction(today, priorWeekEnd);
  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getUTCDay()];

  console.log('\n=== Notification test data seeded ===\n');
  console.log(`Today: ${formatDateOnly(today)} (${dayName})`);
  console.log(`Prior week under test: ${formatDateOnly(priorWeekStart)} – ${formatDateOnly(priorWeekEnd)}`);
  console.log(`Scheduler action if you run compliance TODAY: ${todayAction}\n`);

  console.log('Password (all notify.* users):', NOTIFY_TEST_PASSWORD);
  console.log('\n--- Manager (restore / freeze emails) ---');
  console.log(`  ${MANAGER.username}  →  restore frozen employees, receives freeze emails`);
  console.log(`  Resource profile IDs are printed below for [R] Restore in console.\n`);

  const rows = [
    { user: RESOURCES.fresh.username, scenario: 'Fresh miss — no timesheet, no compliance yet', profileId: freshId },
    { user: RESOURCES.reminder1.username, scenario: 'PENDING + Reminder1 already sent', profileId: reminder1Id },
    { user: RESOURCES.reminder2.username, scenario: 'PENDING + Reminder2 already sent', profileId: reminder2Id },
    { user: RESOURCES.frozen.username, scenario: 'ALREADY FROZEN — use manager to restore', profileId: frozenId },
    { user: RESOURCES.submitted.username, scenario: 'Prior week SUBMITTED — control (no emails)', profileId: submittedId },
    { user: RESOURCES.noop.username, scenario: 'No prior-week allocation — skipped', profileId: noopProfileId },
  ];

  console.log('--- Employees ---');
  for (const row of rows) {
    console.log(`  ${row.user.padEnd(22)} profileId=${String(row.profileId).padEnd(4)} ${row.scenario}`);
  }

  console.log('\n--- What scheduler does per employee TODAY ---');
  if (todayAction === 'REMINDER_1') {
    console.log('  notify.fresh      → Reminder 1 email + PENDING row');
    console.log('  notify.reminder1  → (already R1) Reminder 2 email');
    console.log('  notify.reminder2  → (already R2) wait until freeze day');
    console.log('  notify.frozen     → skip');
    console.log('  notify.submitted  → skip');
  } else if (todayAction === 'REMINDER_2') {
    console.log('  notify.fresh      → Reminder 2 email');
    console.log('  notify.reminder1  → Reminder 2 email');
    console.log('  notify.reminder2  → skip (already R2)');
    console.log('  notify.frozen     → skip');
  } else if (todayAction === 'FREEZE') {
    console.log('  notify.fresh      → FREEZE + MISSED + emails');
    console.log('  notify.reminder1  → FREEZE + MISSED + emails');
    console.log('  notify.reminder2  → FREEZE + MISSED + emails');
    console.log('  notify.frozen     → skip (already frozen)');
  } else {
    console.log('  Today is not Mon/Tue/Wed in the reminder window — no new compliance emails.');
    console.log('  You can still test: notify.frozen restore, notify.submitted login, Mailtrap wiring.');
    console.log('  Or run: npm run compliance:run  (only acts on Mon/Tue/Wed working days)');
  }

  console.log('\n--- AT-RISK email test ---');
  console.log(`  Project "${PROJECT_NAMES.atRisk}" → scheduler may email ${MANAGER.username} once per week\n`);

  console.log('Run compliance once:  npm run compliance:run');
  console.log('Preview all 3 Mailtrap emails:  npm run email:samples');
  console.log('Or restart API with ENABLE_SCHEDULER=true\n');
}

async function main(): Promise<void> {
  try {
    await connectWithRetry();
    await seedNotificationTestData();
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
