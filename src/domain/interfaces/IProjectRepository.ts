import { MilestoneStatus, ProjectStatus } from '@prisma/client';
import { MilestoneListResult, MilestoneView, ProjectListItem } from '../types/admin.types';

export interface CreateProjectInput {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  status: ProjectStatus;
  managerId: number;
  totalStoryPoints: number;
}

export interface UpdateProjectInput {
  projectId: number;
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ProjectStatus;
  managerId?: number;
  totalStoryPoints?: number;
}

export interface CreateMilestoneInput {
  projectId: number;
  title: string;
  dueDate: Date;
  status: MilestoneStatus;
  storyPoints: number;
  sortOrder?: number;
}

export interface UpdateMilestoneInput {
  milestoneId: number;
  projectId: number;
  title?: string;
  dueDate?: Date;
  status?: MilestoneStatus;
  sortOrder?: number;
}

export interface IProjectRepository {
  create(input: CreateProjectInput): Promise<ProjectListItem>;
  list(): Promise<ProjectListItem[]>;
  listByManager(managerUserId: number): Promise<ProjectListItem[]>;
  findById(projectId: number): Promise<ProjectListItem | null>;
  update(input: UpdateProjectInput): Promise<ProjectListItem>;
  holdActiveProjectsByManager(managerUserId: number): Promise<number>;
  countManagedActiveProjects(managerUserId: number): Promise<number>;
  listMilestones(projectId: number): Promise<MilestoneListResult>;
  createMilestone(input: CreateMilestoneInput): Promise<MilestoneView>;
  findMilestone(milestoneId: number, projectId: number): Promise<MilestoneView | null>;
  updateMilestone(input: UpdateMilestoneInput): Promise<MilestoneView>;
}
