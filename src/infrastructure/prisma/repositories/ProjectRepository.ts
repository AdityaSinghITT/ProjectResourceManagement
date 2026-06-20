import { MilestoneStatus, ProjectStatus } from '@prisma/client';
import { ProjectRules } from '../../../shared/constants/projectRules';
import { prisma } from '../client';
import {
  CreateMilestoneInput,
  CreateProjectInput,
  IProjectRepository,
  UpdateMilestoneInput,
  UpdateProjectInput,
} from '../../../domain/interfaces/IProjectRepository';
import { MilestoneListResult, MilestoneView, ProjectListItem } from '../../../domain/types/admin.types';
import { formatDateOnly } from '../../../shared/utils/date.utils';

function mapProject(project: {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: ProjectListItem['status'];
  managerId: number;
  totalStoryPoints: number;
  manager: { fullName: string };
  milestones: { status: MilestoneView['status']; storyPoints: number }[];
}): ProjectListItem {
  const completedStoryPoints = project.milestones
    .filter((milestone) => milestone.status === MilestoneStatus.DONE)
    .reduce((sum, milestone) => sum + milestone.storyPoints, 0);

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    startDate: formatDateOnly(project.startDate),
    endDate: formatDateOnly(project.endDate),
    status: project.status,
    managerId: project.managerId,
    managerName: project.manager.fullName,
    totalStoryPoints: project.totalStoryPoints,
    completedStoryPoints,
  };
}

function mapMilestone(milestone: {
  id: number;
  projectId: number;
  title: string;
  dueDate: Date;
  status: MilestoneView['status'];
  storyPoints: number;
  sortOrder: number;
}): MilestoneView {
  return {
    id: milestone.id,
    projectId: milestone.projectId,
    title: milestone.title,
    dueDate: formatDateOnly(milestone.dueDate),
    status: milestone.status,
    storyPoints: milestone.storyPoints,
    sortOrder: milestone.sortOrder,
  };
}

function buildMilestoneSummary(milestones: MilestoneView[]): MilestoneListResult['summary'] {
  const totalStoryPoints = milestones.reduce((sum, milestone) => sum + milestone.storyPoints, 0);
  const completedStoryPoints = milestones
    .filter((milestone) => milestone.status === MilestoneStatus.DONE)
    .reduce((sum, milestone) => sum + milestone.storyPoints, 0);

  return {
    totalStoryPoints,
    completedStoryPoints,
    remainingStoryPoints: totalStoryPoints - completedStoryPoints,
  };
}

const projectInclude = {
  manager: { select: { fullName: true } },
  milestones: { select: { status: true, storyPoints: true } },
} as const;

export class PrismaProjectRepository implements IProjectRepository {
  async create(input: CreateProjectInput): Promise<ProjectListItem> {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
        managerId: input.managerId,
        totalStoryPoints: input.totalStoryPoints,
      },
      include: projectInclude,
    });

    return mapProject(project);
  }

  async list(): Promise<ProjectListItem[]> {
    const projects = await prisma.project.findMany({
      orderBy: { id: 'asc' },
      include: projectInclude,
    });

    return projects.map(mapProject);
  }

  async listByManager(managerUserId: number): Promise<ProjectListItem[]> {
    const projects = await prisma.project.findMany({
      where: { managerId: managerUserId },
      orderBy: { id: 'asc' },
      include: projectInclude,
    });

    return projects.map(mapProject);
  }

  async findById(projectId: number): Promise<ProjectListItem | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: projectInclude,
    });

    return project ? mapProject(project) : null;
  }

  async holdActiveProjectsByManager(managerUserId: number): Promise<number> {
    const result = await prisma.project.updateMany({
      where: {
        managerId: managerUserId,
        status: { in: [...ProjectRules.STATUSES_REQUIRING_ACTIVE_MANAGER] },
      },
      data: { status: ProjectStatus.ON_HOLD },
    });

    return result.count;
  }

  async countManagedActiveProjects(managerUserId: number): Promise<number> {
    return prisma.project.count({
      where: {
        managerId: managerUserId,
        status: { in: [...ProjectRules.STATUSES_REQUIRING_ACTIVE_MANAGER] },
      },
    });
  }

  async update(input: UpdateProjectInput): Promise<ProjectListItem> {
    const project = await prisma.project.update({
      where: { id: input.projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
        ...(input.totalStoryPoints !== undefined ? { totalStoryPoints: input.totalStoryPoints } : {}),
      },
      include: projectInclude,
    });

    return mapProject(project);
  }

  async listMilestones(projectId: number): Promise<MilestoneListResult> {
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    const mapped = milestones.map(mapMilestone);

    return {
      milestones: mapped,
      summary: buildMilestoneSummary(mapped),
    };
  }

  async createMilestone(input: CreateMilestoneInput): Promise<MilestoneView> {
    const milestone = await prisma.milestone.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        dueDate: input.dueDate,
        status: input.status,
        storyPoints: input.storyPoints,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return mapMilestone(milestone);
  }

  async findMilestone(milestoneId: number, projectId: number): Promise<MilestoneView | null> {
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, projectId },
    });

    return milestone ? mapMilestone(milestone) : null;
  }

  async updateMilestone(input: UpdateMilestoneInput): Promise<MilestoneView> {
    const milestone = await prisma.milestone.update({
      where: { id: input.milestoneId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });

    return mapMilestone(milestone);
  }
}
