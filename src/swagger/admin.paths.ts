import { AdminRoutes, ApiRoutes } from '../shared/constants/apiRoutes';

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
  description: 'User ID (from GET /api/admin/users)',
  schema: { type: 'integer', example: 2 },
};

const employeeIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: 'Employee ID (from GET /api/admin/employees — not user ID)',
  schema: { type: 'integer', example: 1 },
};

const skillIdParam = {
  name: 'skillId',
  in: 'path' as const,
  required: true,
  description: 'Employee skill ID (from GET /api/admin/employees/{id}/skills)',
  schema: { type: 'integer', example: 1 },
};

const projectIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: 'Project ID (from GET /api/admin/projects)',
  schema: { type: 'integer', example: 1 },
};

const milestoneIdParam = {
  name: 'milestoneId',
  in: 'path' as const,
  required: true,
  description: 'Milestone ID (from GET /api/admin/projects/{id}/milestones)',
  schema: { type: 'integer', example: 1 },
};

export const adminPaths = {
  [openApiPath(AdminRoutes.ALLOCATIONS)]: {
    get: {
      tags: ['Admin'],
      summary: 'Company allocation matrix',
      security: adminSecurity,
      parameters: [
        {
          name: 'employeeId',
          in: 'query' as const,
          required: false,
          description: 'Filter by employee ID',
          schema: { type: 'integer', example: 1 },
        },
        {
          name: 'projectId',
          in: 'query' as const,
          required: false,
          description: 'Filter by project ID',
          schema: { type: 'integer', example: 1 },
        },
      ],
      responses: {
        '200': { description: 'Allocation list returned' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Admin role required' },
      },
    },
  },
  [openApiPath(AdminRoutes.USERS)]: {
    post: {
      tags: ['Admin'],
      summary: 'Create user account',
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
                role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'], example: 'MANAGER' },
                department: {
                  type: 'string',
                  description: 'Required when role is EMPLOYEE or MANAGER. Omit for ADMIN.',
                },
                designation: {
                  type: 'string',
                  description: 'Required when role is EMPLOYEE or MANAGER. Omit for ADMIN.',
                },
              },
            },
            examples: {
              admin: {
                summary: 'Create ADMIN (no department/designation)',
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
                  department: 'Delivery',
                  designation: 'Delivery Manager',
                },
              },
              employee: {
                summary: 'Create EMPLOYEE',
                value: {
                  fullName: 'Ravi Kumar',
                  email: 'ravi.kumar@techserve.local',
                  username: 'ravi.kumar',
                  temporaryPassword: 'Employee@99',
                  role: 'EMPLOYEE',
                  department: 'Backend',
                  designation: 'Senior Developer',
                },
              },
            },
          },
        },
      },
      responses: { '200': { description: 'User created' }, '400': { description: 'Validation error' } },
    },
    get: {
      tags: ['Admin'],
      summary: 'List all users',
      security: adminSecurity,
      responses: { '200': { description: 'User list with summary counts' } },
    },
  },
  [openApiPath(AdminRoutes.USER_REACTIVATE)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Reactivate user account',
      security: adminSecurity,
      parameters: [userIdParam],
      responses: { '200': { description: 'User reactivated' } },
    },
  },
  [openApiPath(AdminRoutes.USER_RESET_PASSWORD_LOOKUP)]: {
    post: {
      tags: ['Admin'],
      summary: 'Reset user password by username or user ID',
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
      responses: { '200': { description: 'Password reset' } },
    },
  },
  [openApiPath(AdminRoutes.USER_RESET_PASSWORD)]: {
    post: {
      tags: ['Admin'],
      summary: 'Reset user password by user ID',
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
      responses: { '200': { description: 'Password reset' } },
    },
  },
  [openApiPath(AdminRoutes.USER_DEACTIVATE)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Deactivate user account',
      security: adminSecurity,
      parameters: [userIdParam],
      responses: { '200': { description: 'User deactivated' } },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEES)]: {
    get: {
      tags: ['Admin'],
      summary: 'List employees (filter by status/department)',
      security: adminSecurity,
      parameters: [
        {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter by allocation status',
          schema: { type: 'string', enum: ['BENCH', 'ALLOCATED'], example: 'BENCH' },
        },
        {
          name: 'department',
          in: 'query',
          required: false,
          description: 'Filter by department name',
          schema: { type: 'string', example: 'Backend' },
        },
      ],
      responses: { '200': { description: 'Employee list with bench/allocated counts' } },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_ASSIGN_MANAGER)]: {
    post: {
      tags: ['Admin'],
      summary: 'Assign reporting manager to employee',
      security: adminSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          required: ['employeeUserId', 'managerUserId'],
          properties: {
            employeeUserId: { type: 'integer', example: 4 },
            managerUserId: { type: 'integer', example: 2 },
          },
        },
        { employeeUserId: 4, managerUserId: 2 },
      ),
      responses: { '200': { description: 'Manager assigned' } },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update employee',
      security: adminSecurity,
      parameters: [employeeIdParam],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            department: { type: 'string', example: 'Frontend' },
            designation: { type: 'string', example: 'Lead Developer' },
          },
        },
        { department: 'Frontend', designation: 'Lead Developer' },
      ),
      responses: { '200': { description: 'Employee updated' } },
    },
  },
  [openApiPath(`${AdminRoutes.EMPLOYEE_DEACTIVATE}/preview`)]: {
    get: {
      tags: ['Admin'],
      summary: 'Preview employee deactivation (active allocations)',
      security: adminSecurity,
      parameters: [employeeIdParam],
      responses: { '200': { description: 'Deactivation preview' } },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_DEACTIVATE)]: {
    post: {
      tags: ['Admin'],
      summary: 'Deactivate employee',
      security: adminSecurity,
      parameters: [employeeIdParam],
      responses: { '200': { description: 'Employee deactivated' } },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_SKILLS)]: {
    get: {
      tags: ['Admin'],
      summary: 'List employee skills',
      security: adminSecurity,
      parameters: [employeeIdParam],
      responses: { '200': { description: 'Skills list' } },
    },
    post: {
      tags: ['Admin'],
      summary: 'Add employee skill',
      security: adminSecurity,
      parameters: [employeeIdParam],
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
      responses: { '200': { description: 'Skill added' } },
    },
  },
  [openApiPath(AdminRoutes.EMPLOYEE_SKILL_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update skill proficiency',
      security: adminSecurity,
      parameters: [employeeIdParam, skillIdParam],
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
      responses: { '200': { description: 'Skill updated' } },
    },
    delete: {
      tags: ['Admin'],
      summary: 'Remove employee skill',
      security: adminSecurity,
      parameters: [employeeIdParam, skillIdParam],
      responses: { '200': { description: 'Skill removed' } },
    },
  },
  [openApiPath(AdminRoutes.PROJECTS)]: {
    post: {
      tags: ['Admin'],
      summary: 'Create project',
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
            managerId: { type: 'integer', example: 2 },
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
      responses: { '200': { description: 'Project created' } },
    },
    get: {
      tags: ['Admin'],
      summary: 'List all projects',
      security: adminSecurity,
      responses: { '200': { description: 'Project list' } },
    },
  },
  [openApiPath(AdminRoutes.PROJECT_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update project',
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
      responses: { '200': { description: 'Project updated' }, '400': { description: 'Validation error' } },
    },
  },
  [openApiPath(AdminRoutes.PROJECT_MILESTONES)]: {
    get: {
      tags: ['Admin'],
      summary: 'List project milestones',
      security: adminSecurity,
      parameters: [projectIdParam],
      responses: { '200': { description: 'Milestones list' } },
    },
    post: {
      tags: ['Admin'],
      summary: 'Add milestone',
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
      responses: { '200': { description: 'Milestone created' } },
    },
  },
  [openApiPath(AdminRoutes.PROJECT_MILESTONE_BY_ID)]: {
    patch: {
      tags: ['Admin'],
      summary: 'Update milestone',
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
      responses: { '200': { description: 'Milestone updated' } },
    },
  },
  [openApiPath(AdminRoutes.SYSTEM_CONFIG)]: {
    get: {
      tags: ['Admin'],
      summary: 'Get system configuration (API key masked)',
      security: adminSecurity,
      responses: { '200': { description: 'System config' } },
    },
    patch: {
      tags: ['Admin'],
      summary: 'Update system configuration',
      security: adminSecurity,
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            llmProvider: { type: 'string', enum: ['GEMINI', 'GROQ'], example: 'GEMINI' },
            llmApiKey: { type: 'string', nullable: true, example: 'your-api-key-here' },
            schedulerIntervalHours: { type: 'integer', example: 4 },
            maxWeeklyHours: { type: 'integer', example: 40 },
          },
        },
        { schedulerIntervalHours: 4, maxWeeklyHours: 40 },
      ),
      responses: { '200': { description: 'Config updated' } },
    },
  },
};
