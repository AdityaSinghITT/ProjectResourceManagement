export const ProjectHealthMessages = {
  OVERDUE_MILESTONE: (title: string, dueDate: string) =>
    `Milestone "${title}" is overdue (due ${dueDate}, still IN_PROGRESS)`,
  MILESTONE_DUE_SOON: (title: string, dueDate: string) =>
    `Milestone "${title}" is due on ${dueDate} and has not started`,
  LOW_HOURS: (employeeName: string, loggedHours: number, expectedHours: number) =>
    `${employeeName} logged ${loggedHours}/${expectedHours} expected hours last week (below 50%)`,
  PARTIAL_HOURS: (employeeName: string, loggedHours: number, expectedHours: number) =>
    `${employeeName} logged ${loggedHours}/${expectedHours} expected hours last week (50–80%)`,
} as const;
