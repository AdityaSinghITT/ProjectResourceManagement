import {
  Department,
  Designation,
  LlmProvider,
  MilestoneStatus,
  ProficiencyLevel,
  ProjectStatus,
  ResourceStatus,
  SkillCategory,
} from '@prisma/client';
import { z } from 'zod';
import { ALL_ROLE_NAMES, RoleName } from '../../shared/constants/roleNames';
import { isResourceOrManagerRole } from '../../shared/domain/roleRules';
import { optionalNonEmptyString } from '../../shared/utils/zod.utils';

export const createUserSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    email: z.string().trim().email('Valid email is required'),
    username: z.string().trim().min(1, 'Username is required'),
    temporaryPassword: z.string().min(1, 'Temporary password is required'),
    role: z.enum(ALL_ROLE_NAMES as [RoleName, ...RoleName[]]),
    department: z.nativeEnum(Department).optional(),
    designation: z.nativeEnum(Designation).optional(),
  })
  .superRefine((data, ctx) => {
    if (isResourceOrManagerRole(data.role)) {
      if (!data.department) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Department is required for RESOURCE and MANAGER roles',
          path: ['department'],
        });
      }

      if (!data.designation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Designation is required for RESOURCE and MANAGER roles',
          path: ['designation'],
        });
      }
    }
  });

export const resetPasswordSchema = z.object({
  newTemporaryPassword: z.string().min(1, 'New temporary password is required'),
});

export const resetPasswordByIdentifierSchema = z.object({
  usernameOrUserId: z.string().trim().min(1, 'Username or user ID is required'),
  newTemporaryPassword: z.string().min(1, 'New temporary password is required'),
});

export const assignManagerSchema = z.object({
  employeeUserId: z.number().int().positive('Employee user ID must be a positive integer'),
  managerUserId: z.number().int().positive('Manager user ID must be a positive integer'),
});

export const updateEmployeeSchema = z
  .object({
    department: z.nativeEnum(Department).optional(),
    designation: z.nativeEnum(Designation).optional(),
  })
  .refine((data) => data.department !== undefined || data.designation !== undefined, {
    message: 'At least one field must be provided for update',
  });

export const addSkillSchema = z.object({
  skillName: z.string().trim().min(1, 'Skill name is required'),
  category: z.nativeEnum(SkillCategory),
  proficiency: z.nativeEnum(ProficiencyLevel),
});

export const updateSkillSchema = z.object({
  proficiency: z.nativeEnum(ProficiencyLevel),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required'),
  description: z.string().trim().min(1, 'Description is required'),
  startDate: z.string().min(1, 'Start date is required (YYYY-MM-DD)'),
  endDate: z.string().min(1, 'End date is required (YYYY-MM-DD)'),
  status: z.nativeEnum(ProjectStatus),
  managerId: z.number().int().positive('Manager ID must be a positive integer'),
  totalStoryPoints: z.number().int().nonnegative('Total story points must be zero or greater'),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    status: z.nativeEnum(ProjectStatus).optional(),
    managerId: z.number().int().positive().optional(),
    totalStoryPoints: z.number().int().nonnegative().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.status !== undefined ||
      data.managerId !== undefined ||
      data.totalStoryPoints !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  dueDate: z.string().min(1, 'Due date is required (YYYY-MM-DD)'),
  status: z.nativeEnum(MilestoneStatus),
  storyPoints: z.number().int().nonnegative('Story points must be zero or greater'),
  sortOrder: z.number().int().optional(),
});

export const updateMilestoneSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    dueDate: z.string().min(1).optional(),
    status: z.nativeEnum(MilestoneStatus).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.dueDate !== undefined ||
      data.status !== undefined ||
      data.sortOrder !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export const updateSystemConfigSchema = z
  .object({
    llmProvider: z.nativeEnum(LlmProvider).optional(),
    llmApiKey: z.string().nullable().optional(),
    llmBaseUrl: z.string().trim().url('LLM base URL must be a valid URL').nullable().optional(),
    llmModel: z.string().trim().min(1).nullable().optional(),
    schedulerIntervalHours: z.number().int().positive().optional(),
    maxWeeklyHours: z.number().int().positive().optional(),
  })
  .refine(
    (data) =>
      data.llmProvider !== undefined ||
      data.llmApiKey !== undefined ||
      data.llmBaseUrl !== undefined ||
      data.llmModel !== undefined ||
      data.schedulerIntervalHours !== undefined ||
      data.maxWeeklyHours !== undefined,
    { message: 'At least one configuration field must be provided' },
  );

export const employeeListQuerySchema = z.object({
  status: z
    .enum([ResourceStatus.BENCH, ResourceStatus.ALLOCATED])
    .optional(),
  department: z.nativeEnum(Department).optional(),
});

export const allocationListQuerySchema = z.object({
  resourceProfileId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
});
