import { createEmailSender } from '../email/createEmailSender';
import { PrismaAllocationRepository } from '../prisma/repositories/AllocationRepository';
import { PrismaProjectRepository } from '../prisma/repositories/ProjectRepository';
import { PrismaProjectRiskNotificationRepository } from '../prisma/repositories/ProjectRiskNotificationRepository';
import { PrismaResourceProfileRepository } from '../prisma/repositories/ResourceProfileRepository';
import { PrismaSystemConfigRepository } from '../prisma/repositories/SystemConfigRepository';
import { PrismaTimesheetComplianceRepository } from '../prisma/repositories/TimesheetComplianceRepository';
import { PrismaTimesheetRepository } from '../prisma/repositories/TimesheetRepository';
import { PrismaUserRepository } from '../prisma/repositories/UserRepository';
import { AIService } from '../../application/services/AIService';
import { ProjectHealthService } from '../../application/services/ProjectHealthService';
import { ProjectRiskNotificationService } from '../../application/services/ProjectRiskNotificationService';
import { TimesheetComplianceService } from '../../application/services/TimesheetComplianceService';
import { TimesheetRestoreService } from '../../application/services/TimesheetRestoreService';
import { TimesheetService } from '../../application/services/TimesheetService';
import { PrismaActivityTagRepository } from '../prisma/repositories/ActivityTagRepository';

const resourceProfileRepository = new PrismaResourceProfileRepository();
const allocationRepository = new PrismaAllocationRepository();
const timesheetRepository = new PrismaTimesheetRepository();
const systemConfigRepository = new PrismaSystemConfigRepository();
const activityTagRepository = new PrismaActivityTagRepository();
const complianceRepository = new PrismaTimesheetComplianceRepository();
const projectRepository = new PrismaProjectRepository();
const userRepository = new PrismaUserRepository();
const emailSender = createEmailSender();

export const timesheetComplianceService = new TimesheetComplianceService(
  resourceProfileRepository,
  allocationRepository,
  timesheetRepository,
  complianceRepository,
  emailSender,
);

export const timesheetRestoreService = new TimesheetRestoreService(
  resourceProfileRepository,
  timesheetRepository,
  complianceRepository,
);

export const timesheetService = new TimesheetService(
  timesheetRepository,
  allocationRepository,
  resourceProfileRepository,
  systemConfigRepository,
  activityTagRepository,
  timesheetComplianceService,
);

const projectHealthService = new ProjectHealthService(
  projectRepository,
  allocationRepository,
  timesheetRepository,
  systemConfigRepository,
);

const aiService = new AIService(
  systemConfigRepository,
  resourceProfileRepository,
  allocationRepository,
  timesheetRepository,
  projectRepository,
  projectHealthService,
);

export const projectRiskNotificationService = new ProjectRiskNotificationService(
  projectRepository,
  projectHealthService,
  new PrismaProjectRiskNotificationRepository(),
  userRepository,
  emailSender,
  aiService,
);
