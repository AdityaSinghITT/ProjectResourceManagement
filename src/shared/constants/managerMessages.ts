export const ManagerMessages = {
  ALLOCATION_CREATED: 'Allocation saved successfully.',
  ALLOCATION_ENDED: 'Allocation ended successfully.',
  ALLOCATION_NOT_FOUND: 'Allocation not found',
  ALLOCATION_ALREADY_ENDED: 'Allocation has already ended',
  ALLOCATION_NOT_STARTED: 'Cannot end an allocation that has not started yet',
  ALLOCATION_VALID: 'Allocation is valid.',
  ALLOCATION_VALID_DETAIL: (currentPercent: number, newPercent: number, totalPercent: number) =>
    `${currentPercent}% + ${newPercent}% = ${totalPercent}% ✓ Valid`,
  EMPLOYEE_NOT_IN_TEAM: 'Employee is not in your team.',
  EMPLOYEE_INACTIVE: 'Cannot allocate an inactive employee',
  PROJECT_NOT_FOUND: 'Project not found',
  PROJECT_NOT_OWNED: 'You can only manage allocations on projects you own.',
  PROJECT_NOT_ALLOCATABLE: 'Project must be in PLANNED or ACTIVE status to allocate resources.',
  UTILIZATION_EXCEEDED: (employeeName: string, currentPercent: number, newPercent: number, totalPercent: number) =>
    `${employeeName} total in this period: ${currentPercent}% + ${newPercent}% = ${totalPercent}% — exceeds 100%`,
  EMPLOYEE_NOT_FOUND: 'Employee not found',
  EMPLOYEE_DASHBOARD_NOT_FOUND: 'Employee not found in your team',
} as const;
