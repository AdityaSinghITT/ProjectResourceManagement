import { ApiRoutes, EmployeeRoutes } from '../shared/constants/apiRoutes';

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
                  example: 1,
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
      tags: ['Employee'],
      summary: 'List activity tag catalog',
      description: 'Available to any authenticated user with password changed',
      security: bearerSecurity,
      responses: {
        '200': { description: 'Activity tags returned' },
        '401': { description: 'Unauthorized' },
      },
    },
  },
  [openApiPath(EmployeeRoutes.ALLOCATIONS)]: {
    get: {
      tags: ['Employee'],
      summary: 'List allocatable projects for a week',
      security: bearerSecurity,
      parameters: [weekStartQuery],
      responses: {
        '200': { description: 'Allocations with per-project hour caps' },
        '403': { description: 'Employee role required' },
      },
    },
  },
  [openApiPath(EmployeeRoutes.TIMESHEET_REMINDER)]: {
    get: {
      tags: ['Employee'],
      summary: 'Check if prior week timesheet is missing',
      security: bearerSecurity,
      responses: {
        '200': { description: 'Reminder flag returned' },
      },
    },
  },
  [openApiPath(EmployeeRoutes.TIMESHEETS)]: {
    get: {
      tags: ['Employee'],
      summary: 'List submitted and missed timesheet history',
      security: bearerSecurity,
      responses: {
        '200': { description: 'Timesheet history returned' },
      },
    },
    post: {
      tags: ['Employee'],
      summary: 'Submit weekly timesheet',
      security: bearerSecurity,
      requestBody: submitTimesheetBody,
      responses: {
        '200': { description: 'Timesheet submitted' },
        '400': { description: 'Validation error (hours cap, invalid week, etc.)' },
        '409': { description: 'Duplicate submission for week' },
      },
    },
  },
  [openApiPath(EmployeeRoutes.TIMESHEET_BY_WEEK)]: {
    get: {
      tags: ['Employee'],
      summary: 'Get timesheet detail for a specific week',
      security: bearerSecurity,
      parameters: [weekStartParam],
      responses: {
        '200': { description: 'Week detail returned' },
        '404': { description: 'Timesheet not found' },
      },
    },
  },
};
