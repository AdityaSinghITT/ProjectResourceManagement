import { Request, Response } from 'express';
import { TimesheetService } from '../../application/services/TimesheetService';
import { HttpStatus } from '../../shared/constants/httpStatusCodes';

export class ActivityTagsController {
  constructor(private readonly timesheetService: TimesheetService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const tags = await this.timesheetService.listActivityTags();
    res.status(HttpStatus.OK).json({ tags });
  };
}
