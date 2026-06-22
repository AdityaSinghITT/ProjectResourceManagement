export const TimesheetComplianceConstants = {
  REMINDER_1_WORKING_DAY: 1,
  REMINDER_2_WORKING_DAY: 2,
  FREEZE_WORKING_DAY: 3,
} as const;

export const TimesheetEmailSubjects = {
  REMINDER_1: 'Timesheet reminder — please submit your prior week timesheet',
  REMINDER_2: 'Final reminder — prior week timesheet still pending',
  FROZEN_EMPLOYEE: 'Timesheet submission access frozen',
  FROZEN_MANAGER: 'Team member timesheet submission frozen',
  PROJECT_AT_RISK: 'Project at risk — action recommended',
} as const;
