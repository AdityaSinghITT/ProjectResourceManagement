import { Role } from '@prisma/client';
import { Router } from 'express';
import { AllocationService } from '../../application/services/AllocationService';
import { EmployeeStatusService } from '../../application/services/EmployeeStatusService';
import { ManagerDashboardService } from '../../application/services/ManagerDashboardService';
import { ManagerProjectService } from '../../application/services/ManagerProjectService';
import { PrismaAllocationRepository } from '../../infrastructure/prisma/repositories/AllocationRepository';
import { PrismaEmployeeRepository } from '../../infrastructure/prisma/repositories/EmployeeRepository';
import { ProjectHealthService } from '../../application/services/ProjectHealthService';
import { PrismaProjectRepository } from '../../infrastructure/prisma/repositories/ProjectRepository';
import { PrismaSystemConfigRepository } from '../../infrastructure/prisma/repositories/SystemConfigRepository';
import { PrismaTimesheetRepository } from '../../infrastructure/prisma/repositories/TimesheetRepository';
import { ApiRoutes, ManagerRoutes } from '../../shared/constants/apiRoutes';
import { ManagerController } from '../controllers/manager.controller';
import { timesheetService } from './employee.routes';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { requireRole } from '../middleware/requireRole';

const employeeRepository = new PrismaEmployeeRepository();
const allocationRepository = new PrismaAllocationRepository();
const projectRepository = new PrismaProjectRepository();
const timesheetRepository = new PrismaTimesheetRepository();
const systemConfigRepository = new PrismaSystemConfigRepository();
const projectHealthService = new ProjectHealthService(
  projectRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
);

const employeeStatusService = new EmployeeStatusService(employeeRepository, allocationRepository);
const allocationService = new AllocationService(
  allocationRepository,
  employeeRepository,
  projectRepository,
  employeeStatusService,
);
const managerProjectService = new ManagerProjectService(
  projectRepository,
  allocationRepository,
  projectHealthService,
);
const dashboardService = new ManagerDashboardService(
  employeeRepository,
  allocationRepository,
  timesheetService,
);

const managerController = new ManagerController(
  dashboardService,
  managerProjectService,
  allocationService,
  timesheetService,
);

export const managerRouter = Router();

managerRouter.use(
  authenticate,
  requirePasswordChanged,
  requireRole(Role.MANAGER),
);

managerRouter.get(ManagerRoutes.PROJECTS, asyncHandler(managerController.listProjects));
managerRouter.get(ManagerRoutes.PROJECT_BY_ID, asyncHandler(managerController.getProjectDetail));
managerRouter.get(ManagerRoutes.DASHBOARD, asyncHandler(managerController.getDashboard));
managerRouter.get(
  ManagerRoutes.DASHBOARD_EMPLOYEE,
  asyncHandler(managerController.getEmployeeDetail),
);
managerRouter.post(
  ManagerRoutes.ALLOCATIONS_VALIDATE,
  asyncHandler(managerController.validateAllocation),
);
managerRouter.post(ManagerRoutes.ALLOCATIONS, asyncHandler(managerController.createAllocation));
managerRouter.patch(
  ManagerRoutes.ALLOCATION_END,
  asyncHandler(managerController.endAllocation),
);

managerRouter.get(ManagerRoutes.TIMESHEETS, asyncHandler(managerController.getTeamTimesheets));
managerRouter.get(
  ManagerRoutes.TIMESHEET_EMPLOYEE,
  asyncHandler(managerController.getEmployeeTimesheetDetail),
);

export const managerBasePath = ApiRoutes.MANAGER_BASE;
