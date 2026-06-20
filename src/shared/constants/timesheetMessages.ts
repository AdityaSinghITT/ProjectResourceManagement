export const TimesheetMessages = {
  TIMESHEET_SUBMITTED: 'Timesheet submitted successfully.',
  TIMESHEET_NOT_FOUND: 'Timesheet not found for this week',
  EMPLOYEE_PROFILE_NOT_FOUND: 'Employee profile not found',
  DUPLICATE_WEEK_SUBMISSION: 'Timesheet already submitted for this week',
  FUTURE_WEEK_NOT_ALLOWED: 'Cannot submit timesheet for a future week',
  INVALID_WEEK_START: 'weekStart must be a Monday in YYYY-MM-DD format',
  NO_ENTRIES_PROVIDED: 'At least one project entry is required',
  DUPLICATE_PROJECT_IN_SUBMISSION: 'Duplicate project entries are not allowed in one submission',
  PROJECT_NOT_ALLOCATED_FOR_WEEK: (projectName: string) =>
    `No active allocation for project "${projectName}" during this week`,
  HOURS_EXCEED_PROJECT_CAP: (projectName: string, hours: number, maxHours: number) =>
    `Hours for "${projectName}" (${hours}) exceed the allocation cap of ${maxHours} hours`,
  TOTAL_HOURS_EXCEEDED: (totalHours: number, maxWeeklyHours: number) =>
    `Total hours (${totalHours}) exceed the weekly limit of ${maxWeeklyHours} hours`,
  INVALID_ACTIVITY_TAG: 'One or more activity tags are invalid',
  CUSTOM_TEXT_REQUIRED_FOR_OTHER: 'customText is required when activity tag is "Other"',
  CUSTOM_TEXT_NOT_ALLOWED: 'customText is only allowed for the "Other" activity tag',
  EMPLOYEE_NOT_IN_TEAM: 'Employee is not in your team',
} as const;
