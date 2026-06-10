import { Role } from '@prisma/client';
import { Router } from 'express';
import { AdminUserService } from '../../application/services/AdminUserService';
import { AllocationService } from '../../application/services/AllocationService';
import { EmployeeService } from '../../application/services/EmployeeService';
import { EmployeeStatusService } from '../../application/services/EmployeeStatusService';
import { ProjectService } from '../../application/services/ProjectService';
import { SystemConfigService } from '../../application/services/SystemConfigService';
import { PrismaAdminUserRepository } from '../../infrastructure/prisma/repositories/AdminUserRepository';
import { PrismaAllocationRepository } from '../../infrastructure/prisma/repositories/AllocationRepository';
import { PrismaEmployeeRepository } from '../../infrastructure/prisma/repositories/EmployeeRepository';
import { PrismaProjectRepository } from '../../infrastructure/prisma/repositories/ProjectRepository';
import { PrismaSystemConfigRepository } from '../../infrastructure/prisma/repositories/SystemConfigRepository';
import { PrismaUserRepository } from '../../infrastructure/prisma/repositories/UserRepository';
import { AdminRoutes } from '../../shared/constants/apiRoutes';
import { AdminController } from '../controllers/admin.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requirePasswordChanged } from '../middleware/requirePasswordChanged';
import { requireRole } from '../middleware/requireRole';

const adminUserRepository = new PrismaAdminUserRepository();
const userRepository = new PrismaUserRepository();
const employeeRepository = new PrismaEmployeeRepository();
const projectRepository = new PrismaProjectRepository();
const allocationRepository = new PrismaAllocationRepository();
const systemConfigRepository = new PrismaSystemConfigRepository();

const employeeStatusService = new EmployeeStatusService(employeeRepository, allocationRepository);
const allocationService = new AllocationService(
  allocationRepository,
  employeeRepository,
  projectRepository,
  employeeStatusService,
);

const adminUserService = new AdminUserService(
  adminUserRepository,
  userRepository,
  employeeRepository,
  projectRepository,
);
const employeeService = new EmployeeService(
  employeeRepository,
  userRepository,
  adminUserRepository,
  projectRepository,
);
const projectService = new ProjectService(projectRepository, userRepository, employeeRepository);
const systemConfigService = new SystemConfigService(systemConfigRepository);

const adminController = new AdminController(
  adminUserService,
  employeeService,
  projectService,
  systemConfigService,
  allocationService,
);

export const adminRouter = Router();

adminRouter.use(authenticate, requirePasswordChanged, requireRole(Role.ADMIN));

adminRouter.post(AdminRoutes.USERS, asyncHandler(adminController.createUser));
adminRouter.get(AdminRoutes.USERS, asyncHandler(adminController.listUsers));
adminRouter.post(
  AdminRoutes.USER_RESET_PASSWORD_LOOKUP,
  asyncHandler(adminController.resetUserPasswordByIdentifier),
);
adminRouter.patch(AdminRoutes.USER_REACTIVATE, asyncHandler(adminController.reactivateUser));
adminRouter.post(AdminRoutes.USER_RESET_PASSWORD, asyncHandler(adminController.resetUserPassword));
adminRouter.patch(AdminRoutes.USER_DEACTIVATE, asyncHandler(adminController.deactivateUser));

adminRouter.get(AdminRoutes.EMPLOYEES, asyncHandler(adminController.listEmployees));
adminRouter.post(AdminRoutes.EMPLOYEE_ASSIGN_MANAGER, asyncHandler(adminController.assignManager));
adminRouter.patch(AdminRoutes.EMPLOYEE_BY_ID, asyncHandler(adminController.updateEmployee));
adminRouter.get(
  `${AdminRoutes.EMPLOYEE_DEACTIVATE}/preview`,
  asyncHandler(adminController.previewEmployeeDeactivation),
);
adminRouter.post(AdminRoutes.EMPLOYEE_DEACTIVATE, asyncHandler(adminController.deactivateEmployee));

adminRouter.get(AdminRoutes.EMPLOYEE_SKILLS, asyncHandler(adminController.listEmployeeSkills));
adminRouter.post(AdminRoutes.EMPLOYEE_SKILLS, asyncHandler(adminController.addEmployeeSkill));
adminRouter.patch(AdminRoutes.EMPLOYEE_SKILL_BY_ID, asyncHandler(adminController.updateEmployeeSkill));
adminRouter.delete(AdminRoutes.EMPLOYEE_SKILL_BY_ID, asyncHandler(adminController.removeEmployeeSkill));

adminRouter.post(AdminRoutes.PROJECTS, asyncHandler(adminController.createProject));
adminRouter.get(AdminRoutes.PROJECTS, asyncHandler(adminController.listProjects));
adminRouter.patch(AdminRoutes.PROJECT_BY_ID, asyncHandler(adminController.updateProject));

adminRouter.get(AdminRoutes.PROJECT_MILESTONES, asyncHandler(adminController.listMilestones));
adminRouter.post(AdminRoutes.PROJECT_MILESTONES, asyncHandler(adminController.createMilestone));
adminRouter.patch(AdminRoutes.PROJECT_MILESTONE_BY_ID, asyncHandler(adminController.updateMilestone));

adminRouter.get(AdminRoutes.ALLOCATIONS, asyncHandler(adminController.listAllocations));

adminRouter.get(AdminRoutes.SYSTEM_CONFIG, asyncHandler(adminController.getSystemConfig));
adminRouter.patch(AdminRoutes.SYSTEM_CONFIG, asyncHandler(adminController.updateSystemConfig));
