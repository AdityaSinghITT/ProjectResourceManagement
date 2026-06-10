import { Role } from '@prisma/client';
import { Router } from 'express';
import { TimesheetService } from '../../application/services/TimesheetService';
import { PrismaActivityTagRepository } from '../../infrastructure/prisma/repositories/ActivityTagRepository';
import { PrismaAllocationRepository } from '../../infrastructure/prisma/repositories/AllocationRepository';
import { PrismaEmployeeRepository } from '../../infrastructure/prisma/repositories/EmployeeRepository';
import { PrismaSystemConfigRepository } from '../../infrastructure/prisma/repositories/SystemConfigRepository';
import { PrismaTimesheetRepository } from '../../infrastructure/prisma/repositories/TimesheetRepository';
import { ApiRoutes, EmployeeRoutes } from '../../shared/constants/apiRoutes';
import { EmployeeController } from '../controllers/employee.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { requireRole } from '../middleware/requireRole';

const employeeRepository = new PrismaEmployeeRepository();
const allocationRepository = new PrismaAllocationRepository();
const timesheetRepository = new PrismaTimesheetRepository();
const systemConfigRepository = new PrismaSystemConfigRepository();
const activityTagRepository = new PrismaActivityTagRepository();

const timesheetService = new TimesheetService(
  timesheetRepository,
  allocationRepository,
  employeeRepository,
  systemConfigRepository,
  activityTagRepository,
);

const employeeController = new EmployeeController(timesheetService);

export const employeeRouter = Router();

employeeRouter.use(
  authenticate,
  requirePasswordChanged,
  requireRole(Role.EMPLOYEE),
);

employeeRouter.get(EmployeeRoutes.ALLOCATIONS, asyncHandler(employeeController.getAllocations));
employeeRouter.get(
  EmployeeRoutes.TIMESHEET_REMINDER,
  asyncHandler(employeeController.getReminder),
);
employeeRouter.get(EmployeeRoutes.TIMESHEETS, asyncHandler(employeeController.listTimesheets));
employeeRouter.post(EmployeeRoutes.TIMESHEETS, asyncHandler(employeeController.submitTimesheet));
employeeRouter.get(
  EmployeeRoutes.TIMESHEET_BY_WEEK,
  asyncHandler(employeeController.getWeekDetail),
);

export const employeeBasePath = ApiRoutes.EMPLOYEE_BASE;

export { timesheetService };
