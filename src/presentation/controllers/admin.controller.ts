import { ResourceStatus } from '@prisma/client';
import { Request, Response } from 'express';
import { AdminUserService } from '../../application/services/AdminUserService';
import { AllocationService } from '../../application/services/AllocationService';
import { EmployeeService } from '../../application/services/EmployeeService';
import { ProjectService } from '../../application/services/ProjectService';
import { SystemConfigService } from '../../application/services/SystemConfigService';
import { HttpStatus } from '../../shared/constants/httpStatusCodes';
import { parseBody } from '../../shared/utils/parseBody';
import { parsePositiveIntParam } from '../../shared/utils/parseParams';
import {
  addSkillSchema,
  allocationListQuerySchema,
  assignManagerSchema,
  createMilestoneSchema,
  createProjectSchema,
  createUserSchema,
  employeeListQuerySchema,
  resetPasswordByIdentifierSchema,
  resetPasswordSchema,
  updateEmployeeSchema,
  updateMilestoneSchema,
  updateProjectSchema,
  updateSkillSchema,
  updateSystemConfigSchema,
} from '../validators/admin.schemas';

export class AdminController {
  constructor(
    private readonly adminUserService: AdminUserService,
    private readonly employeeService: EmployeeService,
    private readonly projectService: ProjectService,
    private readonly systemConfigService: SystemConfigService,
    private readonly allocationService: AllocationService,
  ) {}

  createUser = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(createUserSchema, req.body);
    const result = await this.adminUserService.createUser(body);
    res.status(HttpStatus.OK).json(result);
  };

  listUsers = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.adminUserService.listUsers();
    res.status(HttpStatus.OK).json(result);
  };

  reactivateUser = async (req: Request, res: Response): Promise<void> => {
    const userId = parsePositiveIntParam(req.params.id, 'user ID');
    const result = await this.adminUserService.reactivateUser(userId);
    res.status(HttpStatus.OK).json(result);
  };

  resetUserPassword = async (req: Request, res: Response): Promise<void> => {
    const userId = parsePositiveIntParam(req.params.id, 'user ID');
    const body = parseBody(resetPasswordSchema, req.body);
    const result = await this.adminUserService.resetPassword(userId, body.newTemporaryPassword);
    res.status(HttpStatus.OK).json(result);
  };

  resetUserPasswordByIdentifier = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(resetPasswordByIdentifierSchema, req.body);
    const result = await this.adminUserService.resetPasswordByIdentifier(
      body.usernameOrUserId,
      body.newTemporaryPassword,
    );
    res.status(HttpStatus.OK).json(result);
  };

  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    const userId = parsePositiveIntParam(req.params.id, 'user ID');
    const result = await this.adminUserService.deactivateUser(userId);
    res.status(HttpStatus.OK).json(result);
  };

  listEmployees = async (req: Request, res: Response): Promise<void> => {
    const query = parseBody(employeeListQuerySchema, req.query);
    const result = await this.employeeService.listEmployees({
      status: query.status as ResourceStatus | undefined,
      department: query.department,
    });
    res.status(HttpStatus.OK).json(result);
  };

  assignManager = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(assignManagerSchema, req.body);
    const result = await this.employeeService.assignManager(body);
    res.status(HttpStatus.OK).json(result);
  };

  updateEmployee = async (req: Request, res: Response): Promise<void> => {
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const body = parseBody(updateEmployeeSchema, req.body);
    const result = await this.employeeService.updateEmployee(employeeId, body);
    res.status(HttpStatus.OK).json(result);
  };

  previewEmployeeDeactivation = async (req: Request, res: Response): Promise<void> => {
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const result = await this.employeeService.getDeactivationPreview(employeeId);
    res.status(HttpStatus.OK).json(result);
  };

  deactivateEmployee = async (req: Request, res: Response): Promise<void> => {
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const result = await this.employeeService.deactivateEmployee(employeeId);
    res.status(HttpStatus.OK).json(result);
  };

  listEmployeeSkills = async (req: Request, res: Response): Promise<void> => {
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const skills = await this.employeeService.listSkills(employeeId);
    res.status(HttpStatus.OK).json({ skills });
  };

  addEmployeeSkill = async (req: Request, res: Response): Promise<void> => {
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const body = parseBody(addSkillSchema, req.body);
    const result = await this.employeeService.addSkill(employeeId, body);
    res.status(HttpStatus.OK).json(result);
  };

  updateEmployeeSkill = async (req: Request, res: Response): Promise<void> => {
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const skillId = parsePositiveIntParam(req.params.skillId, 'skill ID');
    const body = parseBody(updateSkillSchema, req.body);
    const result = await this.employeeService.updateSkillProficiency(
      employeeId,
      skillId,
      body.proficiency,
    );
    res.status(HttpStatus.OK).json(result);
  };

  removeEmployeeSkill = async (req: Request, res: Response): Promise<void> => {
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const skillId = parsePositiveIntParam(req.params.skillId, 'skill ID');
    const result = await this.employeeService.removeSkill(employeeId, skillId);
    res.status(HttpStatus.OK).json(result);
  };

  createProject = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(createProjectSchema, req.body);
    const result = await this.projectService.createProject(body);
    res.status(HttpStatus.OK).json(result);
  };

  listProjects = async (_req: Request, res: Response): Promise<void> => {
    const projects = await this.projectService.listProjects();
    res.status(HttpStatus.OK).json({ projects });
  };

  updateProject = async (req: Request, res: Response): Promise<void> => {
    const projectId = parsePositiveIntParam(req.params.id, 'project ID');
    const body = parseBody(updateProjectSchema, req.body);
    const result = await this.projectService.updateProject(projectId, body);
    res.status(HttpStatus.OK).json(result);
  };

  listMilestones = async (req: Request, res: Response): Promise<void> => {
    const projectId = parsePositiveIntParam(req.params.id, 'project ID');
    const result = await this.projectService.listMilestones(projectId);
    res.status(HttpStatus.OK).json(result);
  };

  createMilestone = async (req: Request, res: Response): Promise<void> => {
    const projectId = parsePositiveIntParam(req.params.id, 'project ID');
    const body = parseBody(createMilestoneSchema, req.body);
    const result = await this.projectService.createMilestone(projectId, body);
    res.status(HttpStatus.OK).json(result);
  };

  updateMilestone = async (req: Request, res: Response): Promise<void> => {
    const projectId = parsePositiveIntParam(req.params.id, 'project ID');
    const milestoneId = parsePositiveIntParam(req.params.milestoneId, 'milestone ID');
    const body = parseBody(updateMilestoneSchema, req.body);
    const result = await this.projectService.updateMilestone(projectId, milestoneId, body);
    res.status(HttpStatus.OK).json(result);
  };

  listAllocations = async (req: Request, res: Response): Promise<void> => {
    const query = parseBody(allocationListQuerySchema, req.query);
    const result = await this.allocationService.listAdminAllocations(query);
    res.status(HttpStatus.OK).json(result);
  };

  getSystemConfig = async (_req: Request, res: Response): Promise<void> => {
    const config = await this.systemConfigService.getConfig();
    res.status(HttpStatus.OK).json({ config });
  };

  updateSystemConfig = async (req: Request, res: Response): Promise<void> => {
    const body = parseBody(updateSystemConfigSchema, req.body);
    const result = await this.systemConfigService.updateConfig(body);
    res.status(HttpStatus.OK).json(result);
  };
}
