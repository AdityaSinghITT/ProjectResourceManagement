import { PermissionAction, PermissionResource } from '@prisma/client';
import { Router } from 'express';
import { TimesheetService } from '../../application/services/TimesheetService';
import { PrismaActivityTagRepository } from '../../infrastructure/prisma/repositories/ActivityTagRepository';
import { PrismaAllocationRepository } from '../../infrastructure/prisma/repositories/AllocationRepository';
import { PrismaResourceProfileRepository } from '../../infrastructure/prisma/repositories/ResourceProfileRepository';
import { PrismaSystemConfigRepository } from '../../infrastructure/prisma/repositories/SystemConfigRepository';
import { PrismaTimesheetRepository } from '../../infrastructure/prisma/repositories/TimesheetRepository';
import { ApiRoutes, EmployeeRoutes } from '../../shared/constants/apiRoutes';
import { RoleNames } from '../../shared/constants/roleNames';
import { EmployeeController } from '../controllers/employee.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { requirePermission } from '../middleware/requirePermission';
import { requireRole } from '../middleware/requireRole';

const resourceProfileRepository = new PrismaResourceProfileRepository();
const allocationRepository = new PrismaAllocationRepository();
const timesheetRepository = new PrismaTimesheetRepository();
const systemConfigRepository = new PrismaSystemConfigRepository();
const activityTagRepository = new PrismaActivityTagRepository();

const timesheetService = new TimesheetService(
  timesheetRepository,
  allocationRepository,
  resourceProfileRepository,
  systemConfigRepository,
  activityTagRepository,
);

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
