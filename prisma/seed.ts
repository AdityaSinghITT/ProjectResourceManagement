import dotenv from 'dotenv';
import path from 'path';
import {
  LlmProvider,
  Prisma,
  PrismaClient,
  ProficiencyLevel,
  SkillCategory,
  TimesheetStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { addDays, getWeekStart } from '../src/application/utils/week.utils';
import { PrismaAuthorizationRepository } from '../src/infrastructure/prisma/repositories/AuthorizationRepository';
import { RoleName, RoleNames } from '../src/shared/constants/roleNames';
import { formatDateOnly, todayDateOnly } from '../src/shared/utils/date.utils';
import {
  SEED_ALLOCATIONS,
  SEED_MANAGERS,
  SEED_PASSWORDS,
  SEED_PROJECTS,
  SEED_RESOURCES,
  SEED_TIMESHEETS,
  SeedMilestoneDef,
  SeedProjectDef,
} from './seedCatalog';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const authorizationRepository = new PrismaAuthorizationRepository();

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

function stripEnv(value: string | undefined): string | null {
  const trimmed = value?.trim().replace(/^"|"$/g, '');
  return trimmed ? trimmed : null;
}

function offsetDate(days: number): Date {
  return addDays(todayDateOnly(), days);
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

interface SeededDemoUser {
  userId: number;
  resourceProfileId?: number;
}

async function upsertDemoUser(
  username: string,
  email: string,
  fullName: string,
  password: string,
  role: RoleName,
  options?: {
    department?: Prisma.UserCreateInput['department'];
    designation?: Prisma.UserCreateInput['designation'];
    forcePasswordChange?: boolean;
  },
): Promise<SeededDemoUser> {
  const passwordHash = await bcrypt.hash(password, 10);
  const roleRecord = await prisma.role.findUniqueOrThrow({ where: { roleName: role } });

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      email,
      fullName,
      passwordHash,
      department: options?.department,
      designation: options?.designation,
      isActive: true,
      forcePasswordChange: options?.forcePasswordChange ?? false,
    },
    create: {
      username,
      email,
      fullName,
      passwordHash,
      department: options?.department,
      designation: options?.designation,
      isActive: true,
      forcePasswordChange: options?.forcePasswordChange ?? false,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
    update: { isPrimary: true },
    create: { userId: user.id, roleId: roleRecord.id, isPrimary: true },
  });

  if (role === RoleNames.ADMIN) {
    return { userId: user.id };
  }

  const profile = await prisma.resourceProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return { userId: user.id, resourceProfileId: profile.id };
}

async function upsertSkill(
  userId: number,
  skillName: string,
  category: SkillCategory,
  proficiency: ProficiencyLevel,
): Promise<void> {
  const skill = await prisma.skill.upsert({
    where: { name: skillName },
    update: {},
    create: { name: skillName },
  });

  await prisma.userSkill.upsert({
    where: { userId_skillId: { userId, skillId: skill.id } },
    update: { category, proficiency },
    create: { userId, skillId: skill.id, category, proficiency },
  });
}

function buildMilestoneCreates(milestones: SeedMilestoneDef[]) {
  return milestones.map((milestone) => ({
    title: milestone.title,
    dueDate: offsetDate(milestone.dueDateOffsetDays),
    status: milestone.status,
    storyPoints: milestone.storyPoints,
    sortOrder: milestone.sortOrder,
  }));
}

async function upsertProject(
  definition: SeedProjectDef,
  managerUserId: number,
): Promise<{ id: number; name: string }> {
  const existing = await prisma.project.findFirst({ where: { name: definition.name } });

  if (existing) {
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        description: definition.description,
        manager: { connect: { id: managerUserId } },
        startDate: offsetDate(definition.startDateOffsetDays),
        endDate: offsetDate(definition.endDateOffsetDays),
        status: definition.status,
        totalStoryPoints: definition.totalStoryPoints,
      },
    });

    return { id: existing.id, name: existing.name };
  }

  const project = await prisma.project.create({
    data: {
      name: definition.name,
      description: definition.description,
      startDate: offsetDate(definition.startDateOffsetDays),
      endDate: offsetDate(definition.endDateOffsetDays),
      status: definition.status,
      managerId: managerUserId,
      totalStoryPoints: definition.totalStoryPoints,
      milestones: {
        create: buildMilestoneCreates(definition.milestones),
      },
    },
  });

  return { id: project.id, name: project.name };
}

async function upsertAllocation(
  resourceProfileId: number,
  projectId: number,
  utilizationPercent: number,
  fromDate: Date,
  toDate: Date,
): Promise<void> {
  const existing = await prisma.allocation.findFirst({
    where: { resourceProfileId, projectId },
  });

  if (existing) {
    await prisma.allocation.update({
      where: { id: existing.id },
      data: { utilizationPercent, fromDate, toDate },
    });
    return;
  }

  await prisma.allocation.create({
    data: {
      resourceProfileId,
      projectId,
      utilizationPercent,
      fromDate,
      toDate,
    },
  });
}

async function seedTimesheet(
  resourceProfileId: number,
  weekStart: Date,
  entries: Array<{ projectId: number; hours: number; tagIds: number[] }>,
): Promise<void> {
  const existing = await prisma.timesheet.findUnique({
    where: {
      resourceProfileId_weekStart: {
        resourceProfileId,
        weekStart,
      },
    },
  });

  if (existing) {
    return;
  }

  await prisma.timesheet.create({
    data: {
      resourceProfileId,
      weekStart,
      status: TimesheetStatus.SUBMITTED,
      entries: {
        create: entries.map((entry) => ({
          projectId: entry.projectId,
          hours: entry.hours,
          tags: {
            create: entry.tagIds.map((activityTagId) => ({ activityTagId })),
          },
        })),
      },
    },
  });
}

async function seedDemoData(): Promise<void> {
  const managerIds = new Map<string, number>();
  const resourceProfiles = new Map<string, { userId: number; resourceProfileId: number }>();
  const projectIds = new Map<string, number>();
  const activityTagIds = new Map<string, number>();

  for (const manager of SEED_MANAGERS) {
    const seeded = await upsertDemoUser(
      manager.username,
      manager.email,
      manager.fullName,
      SEED_PASSWORDS.manager,
      RoleNames.MANAGER,
      {
        department: manager.department,
        designation: manager.designation,
      },
    );
    managerIds.set(manager.username, seeded.userId);
  }

  for (const resource of SEED_RESOURCES) {
    const managerUserId = managerIds.get(resource.managerUsername);
    if (!managerUserId) {
      throw new Error(`Manager not found for resource ${resource.username}: ${resource.managerUsername}`);
    }

    const seeded = await upsertDemoUser(
      resource.username,
      resource.email,
      resource.fullName,
      SEED_PASSWORDS.resource,
      RoleNames.RESOURCE,
      {
        department: resource.department,
        designation: resource.designation,
      },
    );

    if (!seeded.resourceProfileId) {
      throw new Error(`Resource profile missing for ${resource.username}`);
    }

    await prisma.resourceProfile.update({
      where: { id: seeded.resourceProfileId },
      data: {
        managerId: managerUserId,
        resourceStatus: resource.resourceStatus,
      },
    });

    for (const skill of resource.skills) {
      await upsertSkill(seeded.userId, skill.name, skill.category, skill.proficiency);
    }

    resourceProfiles.set(resource.username, {
      userId: seeded.userId,
      resourceProfileId: seeded.resourceProfileId,
    });
  }

  for (const projectDef of SEED_PROJECTS) {
    const managerUserId = managerIds.get(projectDef.managerUsername);
    if (!managerUserId) {
      throw new Error(`Manager not found for project ${projectDef.name}`);
    }

    const project = await upsertProject(projectDef, managerUserId);
    projectIds.set(project.name, project.id);
  }

  for (const allocation of SEED_ALLOCATIONS) {
    const resource = resourceProfiles.get(allocation.resourceUsername);
    const projectId = projectIds.get(allocation.projectName);

    if (!resource || !projectId) {
      throw new Error(
        `Allocation seed failed for ${allocation.resourceUsername} -> ${allocation.projectName}`,
      );
    }

    await upsertAllocation(
      resource.resourceProfileId,
      projectId,
      allocation.utilizationPercent,
      offsetDate(allocation.fromDateOffsetDays),
      offsetDate(allocation.toDateOffsetDays),
    );
  }

  const tags = await prisma.activityTag.findMany();
  for (const tag of tags) {
    activityTagIds.set(tag.name, tag.id);
  }

  const currentWeekStart = getWeekStart(todayDateOnly());

  for (const timesheet of SEED_TIMESHEETS) {
    const resource = resourceProfiles.get(timesheet.resourceUsername);
    if (!resource) {
      throw new Error(`Timesheet seed failed — unknown resource ${timesheet.resourceUsername}`);
    }

    const weekStart = addDays(currentWeekStart, timesheet.weekOffset * 7);
    const entries = timesheet.entries.map((entry) => {
      const projectId = projectIds.get(entry.projectName);
      if (!projectId) {
        throw new Error(`Timesheet seed failed — unknown project ${entry.projectName}`);
      }

      const tagIds = entry.tagNames.map((tagName) => {
        const tagId = activityTagIds.get(tagName);
        if (!tagId) {
          throw new Error(`Timesheet seed failed — unknown activity tag ${tagName}`);
        }
        return tagId;
      });

      return { projectId, hours: entry.hours, tagIds };
    });

    await seedTimesheet(resource.resourceProfileId, weekStart, entries);
  }

  const priorWeekStart = addDays(currentWeekStart, -7);

  console.log('  Demo accounts (passwords):');
  console.log(`    Managers : ${SEED_MANAGERS.map((m) => m.username).join(', ')} / ${SEED_PASSWORDS.manager}`);
  console.log(`    Resources: ${SEED_RESOURCES.length} employees / ${SEED_PASSWORDS.resource}`);
  console.log(`    Projects : ${SEED_PROJECTS.length} (${SEED_PROJECTS.map((p) => p.name).join(', ')})`);
  console.log(`    Allocations: ${SEED_ALLOCATIONS.length}`);
  console.log(`    Timesheets : ${SEED_TIMESHEETS.length} submitted weeks seeded`);
  console.log(`    Scheduler  : allocated employees without timesheets in lookback weeks will be flagged MISSED`);
  console.log(`    LLM        : org-wide skill match across ${SEED_RESOURCES.length} resources with diverse skills`);
  console.log(`    Sample week: prior completed week ${formatDateOnly(priorWeekStart)}`);
}

async function main(): Promise<void> {
  console.log('Starting seed...');
  await connectWithRetry();

  await authorizationRepository.ensureRolesAndPermissions();

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { roleName: RoleNames.ADMIN } });

  const adminUser = await prisma.user.upsert({
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
      isActive: true,
      forcePasswordChange: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: { isPrimary: true },
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
      isPrimary: true,
    },
  });

  const envLlmProvider = stripEnv(process.env.LLM_PROVIDER);
  const envLlmBaseUrl = stripEnv(process.env.LLM_BASE_URL);
  const envLlmApiKey = stripEnv(process.env.LLM_API_KEY);
  const envLlmModel = stripEnv(process.env.LLM_MODEL);

  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {
      schedulerIntervalHours: 4,
      maxWeeklyHours: 40,
    },
    create: {
      id: 1,
      llmProvider: (envLlmProvider as LlmProvider) ?? LlmProvider.OLLAMA,
      llmApiKey: envLlmApiKey,
      llmBaseUrl: envLlmBaseUrl,
      llmModel: envLlmModel,
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

  await seedDemoData();

  console.log('Seed completed.');
  console.log(`  Admin user: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD} (change on first login)`);
  console.log(`  Roles & permissions: seeded`);
  console.log(`  Activity tags: ${ACTIVITY_TAGS.length}`);
  console.log('  System config: LLM settings stored in DB (Admin > System Configuration); seed only sets LLM on first create');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
