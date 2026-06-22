import { Request, Response } from 'express';
import { AllocationService } from '../../application/services/AllocationService';
import { ManagerDashboardService } from '../../application/services/ManagerDashboardService';
import { ManagerProjectService } from '../../application/services/ManagerProjectService';
import { TimesheetRestoreService } from '../../application/services/TimesheetRestoreService';
import { TimesheetService } from '../../application/services/TimesheetService';
import { HttpStatus } from '../../shared/constants/httpStatusCodes';
import { ErrorTitles } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { parseBody } from '../../shared/utils/parseBody';
import { parsePositiveIntParam } from '../../shared/utils/parseParams';
import { allocationRequestSchema } from '../validators/manager.schemas';
import { optionalWeekStartQuerySchema } from '../validators/timesheet.schemas';

function requireManagerUserId(req: Request): number {
  if (!req.user) {
    throw new AppError(HttpStatus.UNAUTHORIZED, 'Unauthorized', ErrorTitles.UNAUTHORIZED);
  }

  return req.user.id;
}

export class ManagerController {
  constructor(
    private readonly dashboardService: ManagerDashboardService,
    private readonly projectService: ManagerProjectService,
    private readonly allocationService: AllocationService,
    private readonly timesheetService: TimesheetService,
    private readonly timesheetRestoreService: TimesheetRestoreService,
  ) {}

  listProjects = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const result = await this.projectService.listProjects(managerUserId);
    res.status(HttpStatus.OK).json(result);
  };

  getProjectDetail = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const projectId = parsePositiveIntParam(req.params.id, 'project ID');
    const result = await this.projectService.getProjectDetail(managerUserId, projectId);
    res.status(HttpStatus.OK).json(result);
  };

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const result = await this.dashboardService.getDashboard(managerUserId);
    res.status(HttpStatus.OK).json(result);
  };

  getEmployeeDetail = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const employeeId = parsePositiveIntParam(req.params.id, 'employee ID');
    const result = await this.dashboardService.getEmployeeDetail(managerUserId, employeeId);
    res.status(HttpStatus.OK).json(result);
  };

  validateAllocation = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const body = parseBody(allocationRequestSchema, req.body);
    const result = await this.allocationService.validateAllocation(managerUserId, body);
    res.status(HttpStatus.OK).json(result);
  };

  createAllocation = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const body = parseBody(allocationRequestSchema, req.body);
    const result = await this.allocationService.createAllocation(managerUserId, body);
    res.status(HttpStatus.OK).json(result);
  };

  endAllocation = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const allocationId = parsePositiveIntParam(req.params.id, 'allocation ID');
    const result = await this.allocationService.endAllocation(managerUserId, allocationId);
    res.status(HttpStatus.OK).json(result);
  };

  getTeamTimesheets = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const query = parseBody(optionalWeekStartQuerySchema, req.query);
    const result = await this.timesheetService.getTeamTimesheets(managerUserId, query.weekStart);
    res.status(HttpStatus.OK).json(result);
  };

  getEmployeeTimesheetDetail = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const employeeId = parsePositiveIntParam(req.params.employeeId, 'employee ID');
    const query = parseBody(optionalWeekStartQuerySchema, req.query);
    const result = await this.timesheetService.getEmployeeTimesheetDetail(
      managerUserId,
      employeeId,
      query.weekStart,
    );
    res.status(HttpStatus.OK).json(result);
  };

  restoreTimesheetAccess = async (req: Request, res: Response): Promise<void> => {
    const managerUserId = requireManagerUserId(req);
    const employeeId = parsePositiveIntParam(req.params.employeeId, 'employee ID');
    const result = await this.timesheetRestoreService.restoreSubmissionAccess(
      managerUserId,
      employeeId,
    );
    res.status(HttpStatus.OK).json(result);
  };
}
