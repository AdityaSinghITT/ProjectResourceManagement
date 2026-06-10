import { ApiRoutes, ManagerRoutes } from '../shared/constants/apiRoutes';

const managerSecurity = [{ BearerAuth: [] }];
const managerBase = ApiRoutes.MANAGER_BASE;

function openApiPath(expressRoute: string): string {
  return `${managerBase}${expressRoute.replace(/:([A-Za-z]+)/g, '{$1}')}`;
}

const employeeIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: 'Employee ID (from GET /api/manager/dashboard)',
  schema: { type: 'integer', example: 1 },
};

const allocationIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: 'Allocation ID',
  schema: { type: 'integer', example: 1 },
};

const projectIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: 'Project ID (from GET /api/manager/projects)',
  schema: { type: 'integer', example: 1 },
};

const allocationRequestBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['employeeId', 'projectId', 'utilizationPercent', 'fromDate', 'toDate'],
        properties: {
          employeeId: { type: 'integer', example: 1 },
          projectId: {
            type: 'integer',
            example: 1,
            description: 'From GET /api/manager/projects',
          },
          utilizationPercent: { type: 'integer', minimum: 1, maximum: 100, example: 50 },
          fromDate: { type: 'string', format: 'date', example: '2026-06-01' },
          toDate: { type: 'string', format: 'date', example: '2026-08-31' },
        },
      },
    },
  },
};

export const managerPaths = {
  [openApiPath(ManagerRoutes.PROJECTS)]: {
    get: {
      tags: ['Manager'],
      summary: 'List projects owned by the logged-in manager',
      description:
        'Each project includes `healthStatus`: ON_TRACK, ATTENTION, or AT_RISK (computed from milestones and last-week timesheet hours).',
      security: managerSecurity,
      responses: {
        '200': { description: 'Manager project list with health badges and summary counts' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Manager role required' },
      },
    },
  },
  [openApiPath(ManagerRoutes.PROJECT_BY_ID)]: {
    get: {
      tags: ['Manager'],
      summary: 'Project detail with milestones, allocations, and risk flags (Screen 4.3)',
      description:
        'Returns structured risk flags (no LLM). Hour checks use the last completed week (Monday–Sunday before the current week).',
      security: managerSecurity,
      parameters: [projectIdParam],
      responses: {
        '200': { description: 'Project detail with health evaluation returned' },
        '403': { description: 'Project not owned by manager' },
        '404': { description: 'Project not found' },
      },
    },
  },
  [openApiPath(ManagerRoutes.DASHBOARD)]: {
    get: {
      tags: ['Manager'],
      summary: 'Resource dashboard — bench and active team',
      security: managerSecurity,
      responses: {
        '200': { description: 'Dashboard data returned' },
        '401': { description: 'Unauthorized' },
        '403': { description: 'Manager role required' },
      },
    },
  },
  [openApiPath(ManagerRoutes.DASHBOARD_EMPLOYEE)]: {
    get: {
      tags: ['Manager'],
      summary: 'Employee drill-down — skills, allocations, recent activity tags (last 4 weeks)',
      security: managerSecurity,
      parameters: [employeeIdParam],
      responses: {
        '200': { description: 'Employee detail returned' },
        '404': { description: 'Employee not in team' },
      },
    },
  },
  [openApiPath(ManagerRoutes.ALLOCATIONS_VALIDATE)]: {
    post: {
      tags: ['Manager'],
      summary: 'Dry-run allocation validation',
      security: managerSecurity,
      requestBody: allocationRequestBody,
      responses: {
        '200': { description: 'Validation result (valid or invalid message)' },
        '400': { description: 'Validation error' },
        '403': { description: 'Employee not in team or project not owned' },
      },
    },
  },
  [openApiPath(ManagerRoutes.ALLOCATIONS)]: {
    post: {
      tags: ['Manager'],
      summary: 'Create allocation',
      security: managerSecurity,
      requestBody: allocationRequestBody,
      responses: {
        '200': { description: 'Allocation created' },
        '400': { description: 'Utilization exceeds 100% or invalid dates' },
        '403': { description: 'Not project owner or employee not in team' },
      },
    },
  },
  [openApiPath(ManagerRoutes.ALLOCATION_END)]: {
    patch: {
      tags: ['Manager'],
      summary: 'End allocation (sets toDate to today)',
      security: managerSecurity,
      parameters: [allocationIdParam],
      responses: {
        '200': { description: 'Allocation ended' },
        '403': { description: 'Not project owner' },
        '404': { description: 'Allocation not found' },
        '409': { description: 'Allocation already ended' },
      },
    },
  },
  [openApiPath(ManagerRoutes.TIMESHEETS)]: {
    get: {
      tags: ['Manager'],
      summary: 'Team timesheet grid for a week (Screen 4.4)',
      description:
        'Returns employee × project rows for the manager team. Hours are null when not submitted.',
      security: managerSecurity,
      parameters: [
        {
          name: 'weekStart',
          in: 'query' as const,
          required: false,
          description: 'Monday of the week in YYYY-MM-DD format (defaults to current week)',
          schema: { type: 'string', format: 'date', example: '2026-06-02' },
        },
      ],
      responses: {
        '200': { description: 'Team timesheet grid returned' },
        '403': { description: 'Manager role required' },
      },
    },
  },
  [openApiPath(ManagerRoutes.TIMESHEET_EMPLOYEE)]: {
    get: {
      tags: ['Manager'],
      summary: 'Employee timesheet detail for a week',
      security: managerSecurity,
      parameters: [
        {
          name: 'employeeId',
          in: 'path' as const,
          required: true,
          description: 'Employee ID (from GET /api/manager/dashboard)',
          schema: { type: 'integer', example: 3 },
        },
        {
          name: 'weekStart',
          in: 'query' as const,
          required: false,
          description: 'Monday of the week in YYYY-MM-DD format (defaults to current week)',
          schema: { type: 'string', format: 'date', example: '2026-06-02' },
        },
      ],
      responses: {
        '200': { description: 'Timesheet week detail returned' },
        '404': { description: 'Employee not in team or timesheet not found' },
      },
    },
  },
};
