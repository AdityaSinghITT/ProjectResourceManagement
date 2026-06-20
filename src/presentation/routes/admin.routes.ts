import { PermissionAction, PermissionResource } from '@prisma/client';

import { Router } from 'express';

import { AdminUserService } from '../../application/services/AdminUserService';

import { AllocationService } from '../../application/services/AllocationService';

import { EmployeeService } from '../../application/services/EmployeeService';

import { EmployeeStatusService } from '../../application/services/EmployeeStatusService';

import { ProjectService } from '../../application/services/ProjectService';

import { SystemConfigService } from '../../application/services/SystemConfigService';

import { PrismaAdminUserRepository } from '../../infrastructure/prisma/repositories/AdminUserRepository';

import { PrismaAllocationRepository } from '../../infrastructure/prisma/repositories/AllocationRepository';

import { PrismaResourceProfileRepository } from '../../infrastructure/prisma/repositories/ResourceProfileRepository';

import { PrismaProjectRepository } from '../../infrastructure/prisma/repositories/ProjectRepository';

import { PrismaSystemConfigRepository } from '../../infrastructure/prisma/repositories/SystemConfigRepository';

import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/UserRepository';

import { AdminRoutes } from '../../shared/constants/apiRoutes';

import { RoleNames } from '../../shared/constants/roleNames';

import { AdminController } from '../controllers/admin.controller';

import { asyncHandler } from '../middleware/asyncHandler';

import { authenticate } from '../middleware/authenticate';

import { requirePasswordChanged } from '../middleware/requirePasswordChanged';

import { requirePermission } from '../middleware/requirePermission';

import { requireRole } from '../middleware/requireRole';



const adminUserRepository = new PrismaAdminUserRepository();

const userRepository = new PrismaUserRepository();

const resourceProfileRepository = new PrismaResourceProfileRepository();

const projectRepository = new PrismaProjectRepository();

const allocationRepository = new PrismaAllocationRepository();

const systemConfigRepository = new PrismaSystemConfigRepository();



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



const adminUserService = new AdminUserService(

  adminUserRepository,

  userRepository,

  resourceProfileRepository,

  projectRepository,

);

const employeeService = new EmployeeService(

  resourceProfileRepository,

  userRepository,

  adminUserRepository,

  projectRepository,

);

const projectService = new ProjectService(projectRepository, userRepository, resourceProfileRepository);

const systemConfigService = new SystemConfigService(systemConfigRepository);



const adminController = new AdminController(

  adminUserService,

  employeeService,

  projectService,

  systemConfigService,

  allocationService,

);



export const adminRouter = Router();



adminRouter.use(authenticate, requirePasswordChanged, requireRole(RoleNames.ADMIN));



adminRouter.post(

  AdminRoutes.USERS,

  requirePermission(PermissionResource.USERS, PermissionAction.CREATE),

  asyncHandler(adminController.createUser),

);

adminRouter.get(
  AdminRoutes.USERS,
  requirePermission(PermissionResource.USERS, PermissionAction.LIST),
  asyncHandler(adminController.listUsers),
);

adminRouter.post(
  AdminRoutes.USER_RESET_PASSWORD_LOOKUP,
  requirePermission(PermissionResource.USERS, PermissionAction.UPDATE),
  asyncHandler(adminController.resetUserPasswordByIdentifier),
);

adminRouter.patch(
  AdminRoutes.USER_REACTIVATE,
  requirePermission(PermissionResource.USERS, PermissionAction.UPDATE),
  asyncHandler(adminController.reactivateUser),
);

adminRouter.post(
  AdminRoutes.USER_RESET_PASSWORD,
  requirePermission(PermissionResource.USERS, PermissionAction.UPDATE),
  asyncHandler(adminController.resetUserPassword),
);

adminRouter.patch(
  AdminRoutes.USER_DEACTIVATE,
  requirePermission(PermissionResource.USERS, PermissionAction.DELETE),
  asyncHandler(adminController.deactivateUser),
);

adminRouter.get(
  AdminRoutes.EMPLOYEES,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.LIST),
  asyncHandler(adminController.listEmployees),
);

adminRouter.post(
  AdminRoutes.EMPLOYEE_ASSIGN_MANAGER,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.CREATE),
  asyncHandler(adminController.assignManager),
);

adminRouter.patch(
  AdminRoutes.EMPLOYEE_BY_ID,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.UPDATE),
  asyncHandler(adminController.updateEmployee),
);

adminRouter.get(
  `${AdminRoutes.EMPLOYEE_DEACTIVATE}/preview`,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.UPDATE),
  asyncHandler(adminController.previewEmployeeDeactivation),
);

adminRouter.post(
  AdminRoutes.EMPLOYEE_DEACTIVATE,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.UPDATE),
  asyncHandler(adminController.deactivateEmployee),
);

adminRouter.get(
  AdminRoutes.EMPLOYEE_SKILLS,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.LIST),
  asyncHandler(adminController.listEmployeeSkills),
);

adminRouter.post(
  AdminRoutes.EMPLOYEE_SKILLS,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.UPDATE),
  asyncHandler(adminController.addEmployeeSkill),
);

adminRouter.patch(
  AdminRoutes.EMPLOYEE_SKILL_BY_ID,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.UPDATE),
  asyncHandler(adminController.updateEmployeeSkill),
);

adminRouter.delete(
  AdminRoutes.EMPLOYEE_SKILL_BY_ID,
  requirePermission(PermissionResource.RESOURCES, PermissionAction.UPDATE),
  asyncHandler(adminController.removeEmployeeSkill),
);

adminRouter.post(
  AdminRoutes.PROJECTS,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.CREATE),
  asyncHandler(adminController.createProject),
);

adminRouter.get(
  AdminRoutes.PROJECTS,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.LIST),
  asyncHandler(adminController.listProjects),
);

adminRouter.patch(
  AdminRoutes.PROJECT_BY_ID,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.CREATE),
  asyncHandler(adminController.updateProject),
);

adminRouter.get(
  AdminRoutes.PROJECT_MILESTONES,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.READ),
  asyncHandler(adminController.listMilestones),
);

adminRouter.post(
  AdminRoutes.PROJECT_MILESTONES,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.CREATE),
  asyncHandler(adminController.createMilestone),
);

adminRouter.patch(
  AdminRoutes.PROJECT_MILESTONE_BY_ID,
  requirePermission(PermissionResource.PROJECTS, PermissionAction.CREATE),
  asyncHandler(adminController.updateMilestone),
);

adminRouter.get(
  AdminRoutes.ALLOCATIONS,
  requirePermission(PermissionResource.ALLOCATIONS, PermissionAction.LIST),
  asyncHandler(adminController.listAllocations),
);

adminRouter.get(
  AdminRoutes.SYSTEM_CONFIG,
  requirePermission(PermissionResource.SYSTEM_CONFIG, PermissionAction.READ),
  asyncHandler(adminController.getSystemConfig),
);

adminRouter.patch(
  AdminRoutes.SYSTEM_CONFIG,
  requirePermission(PermissionResource.SYSTEM_CONFIG, PermissionAction.UPDATE),
  asyncHandler(adminController.updateSystemConfig),
);


