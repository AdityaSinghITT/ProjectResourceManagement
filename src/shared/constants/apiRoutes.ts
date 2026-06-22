export const ApiRoutes = {
  HEALTH: '/api/health',
  AUTH_BASE: '/api/auth',
  ADMIN_BASE: '/api/admin',
  MANAGER_BASE: '/api/manager',
  EMPLOYEE_BASE: '/api/employee',
  ACTIVITY_TAGS: '/api/activity-tags',
  API_DOCS: '/api-docs',
} as const;

export const AuthRoutes = {
  LOGIN: '/login',
  CHANGE_PASSWORD: '/change-password',
  ME: '/me',
  LOGOUT: '/logout',
} as const;

export const AdminRoutes = {
  USERS: '/users',
  USER_REACTIVATE: '/users/:id/reactivate',
  USER_RESET_PASSWORD_LOOKUP: '/users/reset-password',
  USER_RESET_PASSWORD: '/users/:id/reset-password',
  USER_DEACTIVATE: '/users/:id/deactivate',
  EMPLOYEES: '/employees',
  EMPLOYEE_BY_ID: '/employees/:id',
  EMPLOYEE_ASSIGN_MANAGER: '/employees/assign-manager',
  EMPLOYEE_DEACTIVATE: '/employees/:id/deactivate',
  EMPLOYEE_SKILLS: '/employees/:id/skills',
  EMPLOYEE_SKILL_BY_ID: '/employees/:id/skills/:skillId',
  PROJECTS: '/projects',
  PROJECT_BY_ID: '/projects/:id',
  PROJECT_MILESTONES: '/projects/:id/milestones',
  PROJECT_MILESTONE_BY_ID: '/projects/:id/milestones/:milestoneId',
  SYSTEM_CONFIG: '/system-config',
  ALLOCATIONS: '/allocations',
} as const;

export const ManagerRoutes = {
  PROJECTS: '/projects',
  PROJECT_BY_ID: '/projects/:id',
  DASHBOARD: '/dashboard',
  DASHBOARD_EMPLOYEE: '/dashboard/employees/:id',
  ALLOCATIONS_VALIDATE: '/allocations/validate',
  ALLOCATIONS: '/allocations',
  ALLOCATION_END: '/allocations/:id/end',
  TIMESHEETS: '/timesheets',
  TIMESHEET_EMPLOYEE: '/timesheets/:employeeId',
  TIMESHEET_RESTORE: '/employees/:employeeId/restore-timesheet-access',
  AI_SKILL_MATCH: '/ai/skill-match',
  AI_TEAM_BUILDER: '/ai/team-builder',
  ALLOCATIONS_AI_MATCH: '/allocations/ai-match',
  PROJECT_AI_RISK_SUMMARY: '/projects/:id/ai-risk-summary',
} as const;

export const EmployeeRoutes = {
  ALLOCATIONS: '/allocations',
  TIMESHEETS: '/timesheets',
  TIMESHEET_REMINDER: '/timesheets/reminder',
  TIMESHEET_BY_WEEK: '/timesheets/:weekStart',
} as const;
