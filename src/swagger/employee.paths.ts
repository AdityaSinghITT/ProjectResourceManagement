import { ApiRoutes, EmployeeRoutes } from '../shared/constants/apiRoutes';
import { forbiddenRbacResponse, rbacDescription } from './swaggerCommon';

const bearerSecurity = [{ BearerAuth: [] }];
const employeeBase = ApiRoutes.EMPLOYEE_BASE;

function openApiPath(expressRoute: string): string {
  return `${employeeBase}${expressRoute.replace(/:([A-Za-z]+)/g, '{$1}')}`;
}

const weekStartParam = {
  name: 'weekStart',
  in: 'path' as const,
  required: true,
  description: 'Monday of the week in YYYY-MM-DD format',
  schema: { type: 'string', format: 'date', example: '2026-06-02' },
};

const weekStartQuery = {
  name: 'weekStart',
  in: 'query' as const,
  required: false,
  description: 'Optional Monday date (defaults to current week)',
  schema: { type: 'string', format: 'date', example: '2026-06-02' },
};

const submitTimesheetBody = {
  required: true,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['weekStart', 'entries'],
        properties: {
          weekStart: { type: 'string', format: 'date', example: '2026-06-02' },
          entries: {
            type: 'array',
            items: {
              type: 'object',
              required: ['projectId', 'hours', 'tags'],
              properties: {
                projectId: {
                  type: 'integer',
                  example: 201,
                  description: 'From GET /api/employee/allocations',
                },
                hours: { type: 'number', example: 18 },
                tags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['activityTagId'],
                    properties: {
                      activityTagId: { type: 'integer', example: 1 },
                      customText: {
                        type: 'string',
                        example: 'Production support',
                        description: 'Required only when tag is Other',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const employeePaths = {
  [ApiRoutes.ACTIVITY_TAGS]: {
    get: {
      tags: ['Resource'],
      summary: 'List activity tag catalog',
      description:
        rbacDescription('ACTIVITY_TAGS:LIST', 'ADMIN | MANAGER | RESOURCE') +
        ' Any authenticated role with this permission may call this endpoint.',
      security: bearerSecurity,
      responses: {
        '200': { description: 'Activity tags returned' },
        '401': { description: 'Unauthorized' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(EmployeeRoutes.ALLOCATIONS)]: {
    get: {
      tags: ['Resource'],
      summary: 'List own allocations (BRD Screen 5.3)',
      description: rbacDescription('ALLOCATIONS:READ', 'RESOURCE'),
      security: bearerSecurity,
      parameters: [weekStartQuery],
      responses: {
        '200': { description: 'Own allocations with utilisation' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(EmployeeRoutes.TIMESHEET_REMINDER)]: {
    get: {
      tags: ['Resource'],
      summary: 'Check if prior week timesheet is missing',
      description: rbacDescription('TIMESHEETS:READ', 'RESOURCE'),
      security: bearerSecurity,
      responses: {
        '200': { description: 'Reminder flag returned' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(EmployeeRoutes.TIMESHEETS)]: {
    get: {
      tags: ['Resource'],
      summary: 'List own submitted and missed timesheet history',
      description: rbacDescription('TIMESHEETS:READ', 'RESOURCE'),
      security: bearerSecurity,
      responses: {
        '200': { description: 'Timesheet history returned' },
        ...forbiddenRbacResponse,
      },
    },
    post: {
      tags: ['Resource'],
      summary: 'Submit weekly timesheet (BRD Screen 5.1)',
      description: rbacDescription('TIMESHEETS:SUBMIT', 'RESOURCE'),
      security: bearerSecurity,
      requestBody: submitTimesheetBody,
      responses: {
        '200': { description: 'Timesheet submitted' },
        '400': { description: 'Validation error (hours cap, invalid week, etc.)' },
        '409': { description: 'Duplicate submission for week' },
        ...forbiddenRbacResponse,
      },
    },
  },
  [openApiPath(EmployeeRoutes.TIMESHEET_BY_WEEK)]: {
    get: {
      tags: ['Resource'],
      summary: 'Get own timesheet detail for a specific week',
      description: rbacDescription('TIMESHEETS:READ', 'RESOURCE'),
      security: bearerSecurity,
      parameters: [weekStartParam],
      responses: {
        '200': { description: 'Week detail returned' },
        '404': { description: 'Timesheet not found' },
        ...forbiddenRbacResponse,
      },
    },
  },
};
