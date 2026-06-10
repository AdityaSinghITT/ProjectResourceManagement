import { Router } from 'express';
import { ApiRoutes } from '../../shared/constants/apiRoutes';
import { ActivityTagsController } from '../controllers/activityTags.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { timesheetService } from './employee.routes';

const activityTagsController = new ActivityTagsController(timesheetService);

export const activityTagsRouter = Router();

activityTagsRouter.use(authenticate, requirePasswordChanged);
activityTagsRouter.get('/', asyncHandler(activityTagsController.list));

export const activityTagsBasePath = ApiRoutes.ACTIVITY_TAGS;
