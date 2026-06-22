import { PermissionAction, PermissionResource } from '@prisma/client';
import { Router } from 'express';
import { timesheetService } from '../../infrastructure/wiring/notificationWiring';
import { ApiRoutes, EmployeeRoutes } from '../../shared/constants/apiRoutes';
import { RoleNames } from '../../shared/constants/roleNames';
import { EmployeeController } from '../controllers/employee.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { requirePermission } from '../middleware/requirePermission';
import { requireRole } from '../middleware/requireRole';

const employeeController = new EmployeeController(timesheetService);

export const employeeRouter = Router();

employeeRouter.use(
  authenticate,
  requirePasswordChanged,
  requireRole(RoleNames.RESOURCE),
);

employeeRouter.get(
  EmployeeRoutes.ALLOCATIONS,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.READ),
  asyncHandler(employeeController.getAllocations),
);
employeeRouter.get(
  EmployeeRoutes.TIMESHEET_REMINDER,
  requirePermission(PermissionResource.TIMESHEETS, PermissionAction.READ),
  asyncHandler(employeeController.getReminder),
);
employeeRouter.get(
  EmployeeRoutes.TIMESHEETS,
  requirePermission(PermissionResource.TIMESHEETS, PermissionAction.READ),
  asyncHandler(employeeController.listTimesheets),
);
employeeRouter.post(
  EmployeeRoutes.TIMESHEETS,
  requirePermission(PermissionResource.TIMESHEETS, PermissionAction.SUBMIT),
  asyncHandler(employeeController.submitTimesheet),
);
employeeRouter.get(
  EmployeeRoutes.TIMESHEET_BY_WEEK,
  requirePermission(PermissionResource.TIMESHEETS, PermissionAction.READ),
  asyncHandler(employeeController.getWeekDetail),
);

export const employeeBasePath = ApiRoutes.EMPLOYEE_BASE;

export { timesheetService };
