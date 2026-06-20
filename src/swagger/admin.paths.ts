import { AdminRoutes, ApiRoutes } from '../shared/constants/apiRoutes';
import {
  forbiddenRbacResponse,
  rbacDescription,
  RESOURCE_PROFILE_ID_DESCRIPTION,
  SWAGGER_DEPARTMENTS,
  SWAGGER_DESIGNATIONS,
  SWAGGER_ROLES,
  USER_ID_DESCRIPTION,
} from './swaggerCommon';

const adminSecurity = [{ BearerAuth: [] }];
const adminBase = ApiRoutes.ADMIN_BASE;

/** OpenAPI 3 requires `{id}` path syntax; Express routes use `:id`. */
function openApiPath(expressRoute: string): string {
  return `${adminBase}${expressRoute.replace(/:([A-Za-z]+)/g, '{$1}')}`;
}

const jsonBody = (schema: object, example: object) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      example,
    },
  },
});

const userIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: USER_ID_DESCRIPTION,
  schema: { type: 'integer', example: 2 },
};

const resourceProfileIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: RESOURCE_PROFILE_ID_DESCRIPTION,
  schema: { type: 'integer', example: 101 },
};

const skillIdParam = {
  name: 'skillId',
  in: 'path' as const,
  required: true,
  description: 'User skill record ID (from GET /api/admin/employees/{id}/skills)',
  schema: { type: 'integer', example: 1 },
};

const projectIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: 'Project ID (from GET /api/admin/projects)',
  schema: { type: 'integer', example: 201 },
};

const milestoneIdParam = {
  name: 'milestoneId',
  in: 'path' as const,
  required: true,
  description: 'Milestone ID (from GET /api/admin/projects/{id}/milestones)',
  schema: { type: 'integer', example: 1 },
};

const departmentSchema = {
  type: 'string',
  enum: [...SWAGGER_DEPARTMENTS],
  example: 'ENGINEERING',
};

const designationSchema = {
  type: 'string',
  enum: [...SWAGGER_DESIGNATIONS],
  example: 'SOFTWARE_ENGINEER',
};

export const adminPaths = {
  [openApiPath(AdminRoutes.ALLOCATIONS)]: {
    get: {
      tags: ['Admin'],
      summary: 'Company allocation matrix (BRD Screen 3.3)',
      description: rbacDescription('ALLOCATIONS:LIST', 'ADMIN'),
      security: adminSecurity,
      parameters: [
        {
          name: 'resourceProfileId',
          in: 'query' as const,
          required: false,
          description: RESOURCE_PROFILE_ID_DESCRIPTION,
          schema: { type: 'integer', example: 101 },
        },
        {
          name: 'projectId',
          in: 'query' as const,
          required: false,
          description: 'Filter by project ID',
          schema: { type: 'integer', example: 201 },
        },
      ],
      responses: {
        '200': { description: 'Allocation list returned' },
        '401': { description: 'Unauthorized' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(AdminRoutes.USERS)]: {
    post: {
      tags: ['Admin'],
      summary: 'Create user account (BRD Screen 3.4.1)',
      description: rbacDescription('USERS:CREATE', 'ADMIN'),
      security: adminSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['fullName', 'email', 'username', 'temporaryPassword', 'role'],
              properties: {
                fullName: { type: 'string', example: 'Ankit Shah' },
                email: { type: 'string', format: 'email', example: 'ankit.shah@techserve.local' },
                username: { type: 'string', example: 'ankit.shah' },
                temporaryPassword: { type: 'string', example: 'Manager@99' },
                role: { type: 'string', enum: [...SWAGGER_ROLES], example: 'MANAGER' },
                department: {
                  ...departmentSchema,
                  description: 'Required when role is RESOURCE or MANAGER. Omit for ADMIN.',
                },
                designation: {
                  ...designationSchema,
                  description: 'Required when role is RESOURCE or MANAGER. Omit for ADMIN.',
                },
              },
            },
            examples: {
              admin: {
                summary: 'Create ADMIN',
                value: {
                  fullName: 'Aditya Kumar Singh',
                  email: 'adityasingh@gmail.com',
                  username: 'aditya.singh',
                  temporaryPassword: 'Aditya@123',
                  role: 'ADMIN',
                },
              },
              manager: {
                summary: 'Create MANAGER',
                value: {
                  fullName: 'Ankit Shah',
                  email: 'ankit.shah@techserve.local',
                  username: 'ankit.shah',
                  temporaryPassword: 'Manager@99',
                  role: 'MANAGER',
                  department: 'ENGINEERING',
                  designation: 'PROJECT_MANAGER',
                },
              },
              resource: {
                summary: 'Create RESOURCE (BRD Employee)',
                value: {
                  fullName: 'Ravi Kumar',
                  email: 'ravi.kumar@techserve.local',
                  username: 'ravi.kumar',
                  temporaryPassword: 'Resource@99',
                  role: 'RESOURCE',
                  department: 'ENGINEERING',
                  designation: 'SOFTWARE_ENGINEER',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'User created' },
        '400': { description: 'Validation error' },
        ...forbiddenRbacResponse,
      },
    },
    get: {
      tags: ['Admin'],
      summary: 'List all users',
      description: rbacDescription('USERS:LIST', 'ADMIN'),
      security: adminSecurity,
      responses: {
        '200': { description: 'User list with summary counts' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(AdminRoutes.USER_REACTIVATE)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Reactivate user account',
      description: rbacDescription('USERS:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [userIdParam],
      responses: { '200': { description: 'User reactivated' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.USER_RESET_PASSWORD_LOOKUP)]: {
    post: {
      tags: ['Admin'],
      summary: 'Reset user password by username or user ID',
      description: rbacDescription('USERS:UPDATE', 'ADMIN'),
      security: adminSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['usernameOrUserId', 'newTemporaryPassword'],
          properties: {
            usernameOrUserId: { type: 'string', example: 'ravi.kumar' },
            newTemporaryPassword: { type: 'string', example: 'TempPass@99' },
          },
        },
        { usernameOrUserId: 'ravi.kumar', newTemporaryPassword: 'TempPass@99' },
      ),
      responses: { '200': { description: 'Password reset' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.USER_RESET_PASSWORD)]: {
    post: {
      tags: ['Admin'],
      summary: 'Reset user password by user ID',
      description: rbacDescription('USERS:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [userIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['newTemporaryPassword'],
          properties: {
            newTemporaryPassword: { type: 'string', example: 'TempPass@99' },
          },
        },
        { newTemporaryPassword: 'TempPass@99' },
      ),
      responses: { '200': { description: 'Password reset' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.USER_DEACTIVATE)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Deactivate user account',
      description: rbacDescription('USERS:DELETE', 'ADMIN'),
      security: adminSecurity,
      parameters: [userIdParam],
      responses: { '200': { description: 'User deactivated' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEES)]: {
    get: {
      tags: ['Admin'],
      summary: 'List resource profiles (BRD employees)',
      description:
        rbacDescription('RESOURCES:LIST', 'ADMIN') +
        ' Response `id` is resource profile ID. `status` is BENCH or ALLOCATED.',
      security: adminSecurity,
      parameters: [
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter by resource status',
          schema: { type: 'string', enum: ['BENCH', 'ALLOCATED'], example: 'BENCH' },
        },
        {
          name: 'department',
          in: 'query',
          required: false,
          description: 'Filter by department enum',
          schema: departmentSchema,
        },
      ],
      responses: {
        '200': { description: 'Resource profile list with bench/allocated counts' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_ASSIGN_MANAGER)]: {
    post: {
      tags: ['Admin'],
      summary: 'Assign reporting manager to resource',
      description:
        rbacDescription('RESOURCES:CREATE', 'ADMIN') +
        ' Uses **user IDs** (not resource profile IDs).',
      security: adminSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['employeeUserId', 'managerUserId'],
          properties: {
            employeeUserId: {
              type: 'integer',
              example: 4,
              description: USER_ID_DESCRIPTION,
            },
            managerUserId: {
              type: 'integer',
              example: 2,
              description: USER_ID_DESCRIPTION,
            },
          },
        },
        { employeeUserId: 4, managerUserId: 2 },
      ),
      responses: { '200': { description: 'Manager assigned' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update resource profile department/designation',
      description: rbacDescription('RESOURCES:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [resourceProfileIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            department: departmentSchema,
            designation: designationSchema,
          },
        },
        { department: 'ENGINEERING', designation: 'SENIOR_SOFTWARE_ENGINEER' },
      ),
      responses: { '200': { description: 'Resource profile updated' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(`${AdminRoutes.EMPLOYEE_DEACTIVATE}/preview`)]: {
    get: {
      tags: ['Admin'],
      summary: 'Preview resource deactivation (active allocations)',
      description: rbacDescription('RESOURCES:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [resourceProfileIdParam],
      responses: { '200': { description: 'Deactivation preview with resourceStatus' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_DEACTIVATE)]: {
    post: {
      tags: ['Admin'],
      summary: 'Deactivate resource profile and linked user',
      description: rbacDescription('RESOURCES:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [resourceProfileIdParam],
      responses: { '200': { description: 'Resource deactivated' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_SKILLS)]: {
    get: {
      tags: ['Admin'],
      summary: 'List resource skills',
      description: rbacDescription('RESOURCES:LIST', 'ADMIN'),
      security: adminSecurity,
      parameters: [resourceProfileIdParam],
      responses: { '200': { description: 'Skills list' }, ...forbiddenRbacResponse },
    },
    post: {
      tags: ['Admin'],
      summary: 'Add resource skill',
      description: rbacDescription('RESOURCES:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [resourceProfileIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['skillName', 'category', 'proficiency'],
          properties: {
            skillName: { type: 'string', example: 'Java' },
            category: {
              type: 'string',
              enum: ['BACKEND', 'FRONTEND', 'DEVOPS', 'QA', 'OTHER'],
              example: 'BACKEND',
            },
            proficiency: {
              type: 'string',
              enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
              example: 'INTERMEDIATE',
            },
          },
        },
        { skillName: 'Java', category: 'BACKEND', proficiency: 'INTERMEDIATE' },
      ),
      responses: { '200': { description: 'Skill added' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_SKILL_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update skill proficiency',
      description: rbacDescription('RESOURCES:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [resourceProfileIdParam, skillIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['proficiency'],
          properties: {
            proficiency: {
              type: 'string',
              enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
              example: 'ADVANCED',
            },
          },
        },
        { proficiency: 'ADVANCED' },
      ),
      responses: { '200': { description: 'Skill updated' }, ...forbiddenRbacResponse },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Remove resource skill',
      description: rbacDescription('RESOURCES:UPDATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [resourceProfileIdParam, skillIdParam],
      responses: { '200': { description: 'Skill removed' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.PROJECTS)]: {
    post: {
      tags: ['Admin'],
      summary: 'Create project',
      description: rbacDescription('PROJECTS:CREATE', 'ADMIN'),
      security: adminSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['name', 'description', 'startDate', 'endDate', 'status', 'managerId', 'totalStoryPoints'],
          properties: {
            name: { type: 'string', example: 'Alpha Portal' },
            description: { type: 'string', example: 'Customer portal redesign' },
            startDate: { type: 'string', format: 'date', example: '2026-03-01' },
            endDate: { type: 'string', format: 'date', example: '2026-06-30' },
            status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'], example: 'ACTIVE' },
            managerId: { type: 'integer', example: 2, description: USER_ID_DESCRIPTION },
            totalStoryPoints: { type: 'integer', example: 120 },
          },
        },
        {
          name: 'Alpha Portal',
          description: 'Customer portal redesign',
          startDate: '2026-03-01',
          endDate: '2026-06-30',
          status: 'ACTIVE',
          managerId: 2,
          totalStoryPoints: 120,
        },
      ),
      responses: { '200': { description: 'Project created' }, ...forbiddenRbacResponse },
    },
    get: {
      tags: ['Admin'],
      summary: 'List all projects',
      description: rbacDescription('PROJECTS:LIST', 'ADMIN'),
      security: adminSecurity,
      responses: { '200': { description: 'Project list' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.PROJECT_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update project',
      description: rbacDescription('PROJECTS:CREATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [projectIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] },
            managerId: { type: 'integer' },
            totalStoryPoints: { type: 'integer' },
          },
        },
        {
          name: 'Alpha Portal Updated',
          description: 'Updated customer portal scope',
          startDate: '2026-03-01',
          endDate: '2026-08-01',
          status: 'ON_HOLD',
          managerId: 3,
          totalStoryPoints: 150,
        },
      ),
      responses: {
        '200': { description: 'Project updated' },
        '400': { description: 'Validation error' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(AdminRoutes.PROJECT_MILESTONES)]: {
    get: {
      tags: ['Admin'],
      summary: 'List project milestones',
      description: rbacDescription('PROJECTS:READ', 'ADMIN'),
      security: adminSecurity,
      parameters: [projectIdParam],
      responses: { '200': { description: 'Milestones list' }, ...forbiddenRbacResponse },
    },
    post: {
      tags: ['Admin'],
      summary: 'Add milestone',
      description: rbacDescription('PROJECTS:CREATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [projectIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['title', 'dueDate', 'status', 'storyPoints'],
          properties: {
            title: { type: 'string', example: 'Backend API' },
            dueDate: { type: 'string', format: 'date', example: '2026-04-15' },
            status: {
              type: 'string',
              enum: ['DONE', 'IN_PROGRESS', 'NOT_STARTED'],
              example: 'NOT_STARTED',
            },
            storyPoints: { type: 'integer', example: 40 },
            sortOrder: { type: 'integer', example: 1 },
          },
        },
        { title: 'Backend API', dueDate: '2026-04-15', status: 'NOT_STARTED', storyPoints: 40, sortOrder: 1 },
      ),
      responses: { '200': { description: 'Milestone created' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.PROJECT_MILESTONE_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update milestone',
      description: rbacDescription('PROJECTS:CREATE', 'ADMIN'),
      security: adminSecurity,
      parameters: [projectIdParam, milestoneIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            title: { type: 'string' },
            dueDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['DONE', 'IN_PROGRESS', 'NOT_STARTED'] },
            sortOrder: { type: 'integer' },
          },
        },
        { status: 'IN_PROGRESS' },
      ),
      responses: { '200': { description: 'Milestone updated' }, ...forbiddenRbacResponse },
    },
  },
  [openApiPath(AdminRoutes.SYSTEM_CONFIG)]: {
    get: {
      tags: ['Admin'],
      summary: 'Get system configuration (API key masked)',
      description: rbacDescription('SYSTEM_CONFIG:READ', 'ADMIN'),
      security: adminSecurity,
      responses: { '200': { description: 'System config' }, ...forbiddenRbacResponse },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update system configuration',
      description: rbacDescription('SYSTEM_CONFIG:UPDATE', 'ADMIN'),
      security: adminSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            llmProvider: {
              type: 'string',
              enum: ['OLLAMA', 'GEMINI', 'GROQ'],
              example: 'OLLAMA',
              description: 'Use OLLAMA for private Ollama-compatible hosts (POST /api/generate).',
            },
            llmApiKey: {
              type: 'string',
              nullable: true,
              example: 'your-api-key-here',
              description: 'Optional bearer token for the LLM host.',
            },
            llmBaseUrl: {
              type: 'string',
              nullable: true,
              example: 'http://localhost:11434',
              description: 'Base URL of the LLM host (no trailing path).',
            },
            llmModel: {
              type: 'string',
              nullable: true,
              example: 'gemma3:12b-it-q8_0',
              description: 'Model name passed to the generate API.',
            },
            schedulerIntervalHours: { type: 'integer', example: 4 },
            maxWeeklyHours: { type: 'integer', example: 40 },
          },
        },
        {
          llmProvider: 'OLLAMA',
          llmBaseUrl: 'http://localhost:11434',
          llmModel: 'gemma3:12b-it-q8_0',
          schedulerIntervalHours: 4,
          maxWeeklyHours: 40,
        },
      ),
      responses: { '200': { description: 'Config updated' }, ...forbiddenRbacResponse },
    },
  },
};
