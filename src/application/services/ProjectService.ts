import { MilestoneStatus, ProjectStatus } from '@prisma/client';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { IProjectRepository } from '../../domain/interfaces/IProjectRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { MilestoneListResult, MilestoneView, ProjectListItem } from '../../domain/types/admin.types';
import { validateActiveProjectManager } from '../validators/activeManager.validator';
import { AdminMessages } from '../../shared/constants/adminMessages';
import { ProjectRules } from '../../shared/constants/projectRules';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { ValidationMessages } from '../../shared/constants/validationMessages';
import { AppError } from '../../shared/errors/AppError';
import { parseIsoDate } from '../../shared/utils/date.utils';

export interface CreateProjectRequest {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  managerId: number;
  totalStoryPoints: number;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: ProjectStatus;
  managerId?: number;
  totalStoryPoints?: number;
}

export interface CreateMilestoneRequest {
  title: string;
  dueDate: string;
  status: MilestoneStatus;
  storyPoints: number;
  sortOrder?: number;
}

export interface UpdateMilestoneRequest {
  title?: string;
  dueDate?: string;
  status?: MilestoneStatus;
  sortOrder?: number;
}

export class ProjectService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    private readonly resourceProfileRepository: IResourceProfileRepository,
  ) {}

  async createProject(input: CreateProjectRequest): Promise<{ message: string; project: ProjectListItem }> {
    await this.validateManager(input.managerId);

    const startDate = this.parseDate(input.startDate);
    const endDate = this.parseDate(input.endDate);
    this.ensureDateRangeValid(startDate, endDate);

    const project = await this.projectRepository.create({
      name: input.name,
      description: input.description,
      startDate,
      endDate,
      status: input.status,
      managerId: input.managerId,
      totalStoryPoints: input.totalStoryPoints,
    });

    return { message: AdminMessages.PROJECT_CREATED, project };
  }

  async listProjects(): Promise<ProjectListItem[]> {
    return this.projectRepository.list();
  }

  async updateProject(
    projectId: number,
    input: UpdateProjectRequest,
  ): Promise<{ message: string; project: ProjectListItem }> {
    const existing = await this.requireProject(projectId);
    const resolvedManagerId = input.managerId ?? existing.managerId;

    if (input.managerId !== undefined) {
      await this.validateManager(input.managerId);
    }

    const statusesRequiringActiveManager =
      ProjectRules.STATUSES_REQUIRING_ACTIVE_MANAGER as readonly ProjectStatus[];

    if (input.status !== undefined && statusesRequiringActiveManager.includes(input.status)) {
      await this.validateManager(resolvedManagerId);
    }

    const startDate = input.startDate ? this.parseDate(input.startDate) : this.parseDate(existing.startDate);
    const endDate = input.endDate ? this.parseDate(input.endDate) : this.parseDate(existing.endDate);
    this.ensureDateRangeValid(startDate, endDate);

    const project = await this.projectRepository.update({
      projectId,
      name: input.name,
      description: input.description,
      startDate: input.startDate ? startDate : undefined,
      endDate: input.endDate ? endDate : undefined,
      status: input.status,
      managerId: input.managerId,
      totalStoryPoints: input.totalStoryPoints,
    });

    return { message: AdminMessages.PROJECT_UPDATED, project };
  }

  async listMilestones(projectId: number): Promise<MilestoneListResult> {
    await this.requireProject(projectId);
    return this.projectRepository.listMilestones(projectId);
  }

  async createMilestone(
    projectId: number,
    input: CreateMilestoneRequest,
  ): Promise<{ message: string; milestone: MilestoneView }> {
    await this.requireProject(projectId);

    const milestone = await this.projectRepository.createMilestone({
      projectId,
      title: input.title,
      dueDate: this.parseDate(input.dueDate),
      status: input.status,
      storyPoints: input.storyPoints,
      sortOrder: input.sortOrder,
    });

    return { message: AdminMessages.MILESTONE_CREATED, milestone };
  }

  async updateMilestone(
    projectId: number,
    milestoneId: number,
    input: UpdateMilestoneRequest,
  ): Promise<{ message: string; milestone: MilestoneView }> {
    await this.requireProject(projectId);
    await this.requireMilestone(projectId, milestoneId);

    const milestone = await this.projectRepository.updateMilestone({
      milestoneId,
      projectId,
      title: input.title,
      dueDate: input.dueDate ? this.parseDate(input.dueDate) : undefined,
      status: input.status,
      sortOrder: input.sortOrder,
    });

    return { message: AdminMessages.MILESTONE_UPDATED, milestone };
  }

  private async validateManager(managerUserId: number): Promise<void> {
    await validateActiveProjectManager(
      managerUserId,
      this.userRepository,
      this.resourceProfileRepository,
    );
  }

  private async requireProject(projectId: number): Promise<ProjectListItem> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.PROJECT_NOT_FOUND, ErrorTitles.NOT_FOUND);
    }

    return project;
  }

  private async requireMilestone(projectId: number, milestoneId: number): Promise<MilestoneView> {
    const milestone = await this.projectRepository.findMilestone(milestoneId, projectId);

    if (!milestone) {
      throw new AppError(HttpStatus.NOT_FOUND, AdminMessages.MILESTONE_NOT_FOUND, ErrorTitles.NOT_FOUND);
    }

    return milestone;
  }

  private parseDate(dateString: string): Date {
    try {
      return parseIsoDate(dateString);
    } catch {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ValidationMessages.INVALID_DATE_FORMAT,
        ErrorTitles.BAD_REQUEST,
      );
    }
  }

  private ensureDateRangeValid(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ValidationMessages.START_DATE_BEFORE_END_DATE,
        ErrorTitles.BAD_REQUEST,
      );
    }
  }
}
