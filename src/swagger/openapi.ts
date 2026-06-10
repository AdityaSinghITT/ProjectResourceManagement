import { AuthRoutes, ApiRoutes } from '../shared/constants/apiRoutes';
import { adminPaths } from './admin.paths';
import { employeePaths } from './employee.paths';
import { managerPaths } from './manager.paths';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'PRM Tool API',
    version: '1.0.0',
    description: 'Project & Resource Management Tool — REST API',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'Admin@1234' },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['newPassword', 'confirmPassword'],
        properties: {
          newPassword: { type: 'string', example: 'NewPass@99' },
          confirmPassword: { type: 'string', example: 'NewPass@99' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          username: { type: 'string' },
          email: { type: 'string' },
          fullName: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
          forcePasswordChange: { type: 'boolean' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/UserProfile' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Admin', description: 'Admin master data management (ADMIN role required)' },
    { name: 'Manager', description: 'Manager allocations and resource dashboard (MANAGER role required)' },
    { name: 'Employee', description: 'Employee timesheets and activity tags (EMPLOYEE role for /api/employee/*)' },
  ],
  paths: {
  [`${ApiRoutes.AUTH_BASE}${AuthRoutes.LOGIN}`]: {
      post: {
        tags: ['Auth'],
        summary: 'Login with username and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
          '403': {
            description: 'Account deactivated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiError' },
              },
            },
          },
        },
      },
    },
    [`${ApiRoutes.AUTH_BASE}${AuthRoutes.CHANGE_PASSWORD}`]: {
      post: {
        tags: ['Auth'],
        summary: 'Change password (required on first login)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Password updated successfully' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    [`${ApiRoutes.AUTH_BASE}${AuthRoutes.ME}`]: {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'User profile returned' },
          '403': { description: 'Password change required' },
        },
      },
    },
    [`${ApiRoutes.AUTH_BASE}${AuthRoutes.LOGOUT}`]: {
      post: {
        tags: ['Auth'],
        summary: 'Logout (client discards token)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Logged out successfully' },
        },
      },
    },
    ...adminPaths,
    ...managerPaths,
    ...employeePaths,
  },
};
