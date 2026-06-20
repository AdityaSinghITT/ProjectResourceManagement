import { ApiRoutes, ManagerRoutes } from '../shared/constants/apiRoutes';
import {
  forbiddenRbacResponse,
  rbacDescription,
  RESOURCE_PROFILE_ID_DESCRIPTION,
} from './swaggerCommon';

const managerSecurity = [{ BearerAuth: [] }];
const managerBase = ApiRoutes.MANAGER_BASE;

function openApiPath(expressRoute: string): string {
  return `${managerBase}${expressRoute.replace(/:([A-Za-z]+)/g, '{$1}')}`;
}

const resourceProfileIdParam = {
  name: 'id',
  in: 'path' as const,
  required: true,
  description: RESOURCE_PROFILE_ID_DESCRIPTION,
  schema: { type: 'integer', example: 101 },
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
  schema: { type: 'integer', example: 201 },
};

const allocationRequestBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['employeeId', 'projectId', 'utilizationPercent', 'fromDate', 'toDate'],
        properties: {
          employeeId: {
            type: 'integer',
            example: 101,
            description: RESOURCE_PROFILE_ID_DESCRIPTION,
          },
          projectId: {
            type: 'integer',
            example: 201,
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
        rbacDescription('PROJECTS:LIST', 'MANAGER') +
        ' Each project includes `healthStatus`: ON_TRACK, ATTENTION, or AT_RISK.',
      security: managerSecurity,
      responses: {
        '200': { description: 'Manager project list with health badges and summary counts' },
        '401': { description: 'Unauthorized' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.PROJECT_BY_ID)]: {
    get: {
      tags: ['Manager'],
      summary: 'Project detail with milestones, allocations, and risk flags (Screen 4.3)',
      description:
        rbacDescription('PROJECTS:READ', 'MANAGER') +
        ' Returns structured risk flags (no LLM). Hour checks use the last completed week.',
      security: managerSecurity,
      parameters: [projectIdParam],
      responses: {
        '200': { description: 'Project detail with health evaluation returned' },
        '403': { description: 'Project not owned by manager or missing permission' },
        '404': { description: 'Project not found' },
      },
    },
  },
  [openApiPath(ManagerRoutes.DASHBOARD)]: {
    get: {
      tags: ['Manager'],
      summary: 'Resource dashboard — bench and active team',
      description: rbacDescription('DASHBOARD:READ', 'MANAGER'),
      security: managerSecurity,
      responses: {
        '200': { description: 'Dashboard data returned' },
        '401': { description: 'Unauthorized' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.DASHBOARD_EMPLOYEE)]: {
    get: {
      tags: ['Manager'],
      summary: 'Resource drill-down — skills, allocations, recent activity tags',
      description: rbacDescription('DASHBOARD:READ', 'MANAGER'),
      security: managerSecurity,
      parameters: [resourceProfileIdParam],
      responses: {
        '200': { description: 'Resource detail returned' },
        '404': { description: 'Resource not in team' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.ALLOCATIONS_VALIDATE)]: {
    post: {
      tags: ['Manager'],
      summary: 'Dry-run allocation validation',
      description: rbacDescription('ALLOCATIONS:CREATE', 'MANAGER'),
      security: managerSecurity,
      requestBody: allocationRequestBody,
      responses: {
        '200': { description: 'Validation result (valid or invalid message)' },
        '400': { description: 'Validation error' },
        '403': { description: 'Resource not in team or project not owned' },
      },
    },
  },
  [openApiPath(ManagerRoutes.ALLOCATIONS)]: {
    post: {
      tags: ['Manager'],
      summary: 'Create allocation',
      description: rbacDescription('ALLOCATIONS:CREATE', 'MANAGER'),
      security: managerSecurity,
      requestBody: allocationRequestBody,
      responses: {
        '200': { description: 'Allocation created' },
        '400': { description: 'Utilization exceeds 100% or invalid dates' },
        '403': { description: 'Not project owner or resource not in team' },
      },
    },
  },
  [openApiPath(ManagerRoutes.ALLOCATION_END)]: {
    patch: {
      tags: ['Manager'],
      summary: 'End allocation (sets toDate to today)',
      description: rbacDescription('ALLOCATIONS:UPDATE', 'MANAGER'),
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
        rbacDescription('TIMESHEETS:VIEW_TEAM', 'MANAGER') +
        ' Rows include `resourceProfileId` for detail drill-down.',
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
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.TIMESHEET_EMPLOYEE)]: {
    get: {
      tags: ['Manager'],
      summary: 'Resource timesheet detail for a week',
      description: rbacDescription('TIMESHEETS:VIEW_TEAM', 'MANAGER'),
      security: managerSecurity,
      parameters: [
        {
          name: 'employeeId',
          in: 'path' as const,
          required: true,
          description: RESOURCE_PROFILE_ID_DESCRIPTION,
          schema: { type: 'integer', example: 101 },
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
        '404': { description: 'Resource not in team or timesheet not found' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.AI_SKILL_MATCH)]: {
    post: {
      tags: ['Manager', 'AI'],
      summary: 'AI skill match — rank organization employees for a requirement',
      description:
        rbacDescription('ALLOCATIONS:CREATE', 'MANAGER') +
        ' Searches all active organization resources (not limited to the logged-in manager team). Pre-filters by utilization and availability, then calls the configured LLM (OLLAMA).',
      security: managerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['requirement'],
              properties: {
                requirement: {
                  type: 'string',
                  example: 'Senior React developer, 50% for 3 months',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Ranked matches with AI disclaimer' },
        '401': { description: 'Unauthorized' },
        '502': { description: 'LLM host error or invalid response' },
        '503': { description: 'LLM not configured' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.AI_TEAM_BUILDER)]: {
    post: {
      tags: ['Manager', 'AI'],
      summary: 'AI team builder — multi-role skill match from one NL prompt',
      description:
        rbacDescription('ALLOCATIONS:CREATE', 'MANAGER') +
        ' Org-wide search. Parses multiple roles from one requirement, assigns only 100% available employees, returns per-role FILLED or GAP. No allocation performed.',
      security: managerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['requirement'],
              properties: {
                requirement: {
                  type: 'string',
                  example:
                    'For a new banking portal we need a Senior Java Developer with advanced Java, a DevOps Engineer with Docker, and a QA Tester with Selenium.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Per-role team builder results with AI disclaimer' },
        '400': { description: 'Validation error' },
        '502': { description: 'LLM host error or invalid response' },
        '503': { description: 'LLM not configured' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.ALLOCATIONS_AI_MATCH)]: {
    post: {
      tags: ['Manager', 'AI'],
      summary: 'Alias for AI skill match (allocation workflow)',
      description: rbacDescription('ALLOCATIONS:CREATE', 'MANAGER') + ' Same as POST /ai/skill-match.',
      security: managerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['requirement'],
              properties: { requirement: { type: 'string' } },
            },
          },
        },
      },
      responses: {
        '200': { description: 'Ranked matches' },
        '502': { description: 'LLM error' },
        '503': { description: 'LLM not configured' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(ManagerRoutes.PROJECT_AI_RISK_SUMMARY)]: {
    post: {
      tags: ['Manager', 'AI'],
      summary: 'AI plain-English project health risk summary',
      description:
        rbacDescription('PROJECTS:READ', 'MANAGER') +
        ' Uses structured health evaluation from ProjectHealthService as LLM context.',
      security: managerSecurity,
      parameters: [projectIdParam],
      responses: {
        '200': { description: 'AI summary paragraph plus structured health' },
        '404': { description: 'Project not found' },
        '502': { description: 'LLM error' },
        '503': { description: 'LLM not configured' },
        ...forbiddenRbacResponse,
      },
    },
  },
};
