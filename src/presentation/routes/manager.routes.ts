import { PermissionAction, PermissionResource } from '@prisma/client';
import { Router } from 'express';
import { AllocationService } from '../../application/services/AllocationService';
import { EmployeeStatusService } from '../../application/services/EmployeeStatusService';
import { ManagerDashboardService } from '../../application/services/ManagerDashboardService';
import { ManagerProjectService } from '../../application/services/ManagerProjectService';
import { PrismaAllocationRepository } from '../../infrastructure/prisma/repositories/AllocationRepository';
import { PrismaResourceProfileRepository } from '../../infrastructure/prisma/repositories/ResourceProfileRepository';
import { ProjectHealthService } from '../../application/services/ProjectHealthService';
import { PrismaProjectRepository } from '../../infrastructure/prisma/repositories/ProjectRepository';
import { PrismaSystemConfigRepository } from '../../infrastructure/prisma/repositories/SystemConfigRepository';
import { PrismaTimesheetRepository } from '../../infrastructure/prisma/repositories/TimesheetRepository';
import { ApiRoutes, ManagerRoutes } from '../../shared/constants/apiRoutes';
import { RoleNames } from '../../shared/constants/roleNames';
import { AIService } from '../../application/services/AIService';
import { ManagerAiController } from '../controllers/managerAi.controller';
import { ManagerController } from '../controllers/manager.controller';
import { timesheetRestoreService, timesheetService } from '../../infrastructure/wiring/notificationWiring';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { requirePermission } from '../middleware/requirePermission';
import { requireRole } from '../middleware/requireRole';

const resourceProfileRepository = new PrismaResourceProfileRepository();
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

const employeeStatusService = new EmployeeStatusService(
  resourceProfileRepository,
  allocationRepository,
);
const allocationService = new AllocationService(
  allocationRepository,
  resourceProfileRepository,
  projectRepository,
  employeeStatusService,
);
const managerProjectService = new ManagerProjectService(
  projectRepository,
  allocationRepository,
  projectHealthService,
);
const dashboardService = new ManagerDashboardService(
  resourceProfileRepository,
  allocationRepository,
  timesheetService,
);

const aiService = new AIService(
  systemConfigRepository,
  resourceProfileRepository,
  allocationRepository,
  timesheetRepository,
  projectRepository,
  projectHealthService,
);

const managerController = new ManagerController(
  dashboardService,
  managerProjectService,
  allocationService,
  timesheetService,
  timesheetRestoreService,
);

const managerAiController = new ManagerAiController(aiService);

export const managerRouter = Router();

managerRouter.use(
  authenticate,
  requirePasswordChanged,
  requireRole(RoleNames.MANAGER),
);

managerRouter.get(
  ManagerRoutes.PROJECTS,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.LIST),
  asyncHandler(managerController.listProjects),
);
managerRouter.get(
  ManagerRoutes.PROJECT_BY_ID,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.READ),
  asyncHandler(managerController.getProjectDetail),
);
managerRouter.get(
  ManagerRoutes.DASHBOARD,
  requirePermission(PermissionResource.DASHBOARD, PermissionAction.READ),
  asyncHandler(managerController.getDashboard),
);
managerRouter.get(
  ManagerRoutes.DASHBOARD_EMPLOYEE,
  requirePermission(PermissionResource.DASHBOARD, PermissionAction.READ),
  asyncHandler(managerController.getEmployeeDetail),
);
managerRouter.post(
  ManagerRoutes.ALLOCATIONS_VALIDATE,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.CREATE),
  asyncHandler(managerController.validateAllocation),
);
managerRouter.post(
  ManagerRoutes.ALLOCATIONS,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.CREATE),
  asyncHandler(managerController.createAllocation),
);
managerRouter.patch(
  ManagerRoutes.ALLOCATION_END,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.UPDATE),
  asyncHandler(managerController.endAllocation),
);

managerRouter.get(
  ManagerRoutes.TIMESHEETS,
  requirePermission(PermissionResource.TIMESHEETS, PermissionAction.VIEW_TEAM),
  asyncHandler(managerController.getTeamTimesheets),
);
managerRouter.get(
  ManagerRoutes.TIMESHEET_EMPLOYEE,
  requirePermission(PermissionResource.TIMESHEETS, PermissionAction.VIEW_TEAM),
  asyncHandler(managerController.getEmployeeTimesheetDetail),
);
managerRouter.post(
  ManagerRoutes.TIMESHEET_RESTORE,
  requirePermission(PermissionResource.TIMESHEETS, PermissionAction.UPDATE),
  asyncHandler(managerController.restoreTimesheetAccess),
);

managerRouter.post(
  ManagerRoutes.AI_SKILL_MATCH,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.CREATE),
  asyncHandler(managerAiController.skillMatch),
);

managerRouter.post(
  ManagerRoutes.AI_TEAM_BUILDER,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.CREATE),
  asyncHandler(managerAiController.teamBuilder),
);

managerRouter.post(
  ManagerRoutes.ALLOCATIONS_AI_MATCH,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.CREATE),
  asyncHandler(managerAiController.allocationsAiMatch),
);

managerRouter.post(
  ManagerRoutes.PROJECT_AI_RISK_SUMMARY,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.READ),
  asyncHandler(managerAiController.projectRiskSummary),
);

export const managerBasePath = ApiRoutes.MANAGER_BASE;
