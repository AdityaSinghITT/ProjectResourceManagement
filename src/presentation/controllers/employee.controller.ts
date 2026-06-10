import { Request, Response } from 'express';
import { TimesheetService } from '../../application/services/TimesheetService';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { parseBody } from '../../shared/utils/parseBody';
import {
  optionalWeekStartQuerySchema,
  submitTimesheetSchema,
  weekStartParamSchema,
} from '../validators/timesheet.schemas';

function requireEmployeeUserId(req: Request): number {
  if (!req.user) {
    throw new AppError(HttpStatus.UNAUTHORIZED, 'Unauthorized', ErrorTitles.UNAUTHORIZED);
  }

  return req.user.id;
}

export class EmployeeController {
  constructor(private readonly timesheetService: TimesheetService) {}

  getAllocations = async (req: Request, res: Response): Promise<void> => {
    const userId = requireEmployeeUserId(req);
    const query = parseBody(optionalWeekStartQuerySchema, req.query);
    const result = await this.timesheetService.getEmployeeAllocations(userId, query.weekStart);
    res.status(HttpStatus.OK).json(result);
  };

  listTimesheets = async (req: Request, res: Response): Promise<void> => {
    const userId = requireEmployeeUserId(req);
    const result = await this.timesheetService.listHistory(userId);
    res.status(HttpStatus.OK).json(result);
  };

  getReminder = async (req: Request, res: Response): Promise<void> => {
    const userId = requireEmployeeUserId(req);
    const result = await this.timesheetService.getReminder(userId);
    res.status(HttpStatus.OK).json(result);
  };

  getWeekDetail = async (req: Request, res: Response): Promise<void> => {
    const userId = requireEmployeeUserId(req);
    const params = parseBody(weekStartParamSchema, req.params);
    const result = await this.timesheetService.getWeekDetail(userId, params.weekStart);
    res.status(HttpStatus.OK).json(result);
  };

  submitTimesheet = async (req: Request, res: Response): Promise<void> => {
    const userId = requireEmployeeUserId(req);
    const body = parseBody(submitTimesheetSchema, req.body);
    const result = await this.timesheetService.submit(userId, body.weekStart, body.entries);
    res.status(HttpStatus.OK).json(result);
  };
}
