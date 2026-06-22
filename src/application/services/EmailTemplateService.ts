import { TimesheetEmailSubjects } from '../../shared/constants/timesheetComplianceConstants';
import { formatWeekRange } from '../utils/week.utils';

export function buildReminder1Email(fullName: string, weekStart: Date): { subject: string; text: string } {
  const weekLabel = formatWeekRange(weekStart);
  return {
    subject: TimesheetEmailSubjects.REMINDER_1,
    text: [
      `Hi ${fullName},`,
      '',
      `You have not submitted your timesheet for the week ${weekLabel}.`,
      'Please submit it as soon as possible to avoid access restrictions.',
      '',
      '— PRM Tool',
    ].join('\n'),
  };
}

export function buildReminder2Email(fullName: string, weekStart: Date): { subject: string; text: string } {
  const weekLabel = formatWeekRange(weekStart);
  return {
    subject: TimesheetEmailSubjects.REMINDER_2,
    text: [
      `Hi ${fullName},`,
      '',
      `This is your final reminder. Your timesheet for ${weekLabel} is still pending.`,
      'If not submitted by the next working day, your timesheet submission access will be frozen.',
      '',
      '— PRM Tool',
    ].join('\n'),
  };
}

export function buildFreezeEmployeeEmail(
  fullName: string,
  weekStart: Date,
): { subject: string; text: string } {
  const weekLabel = formatWeekRange(weekStart);
  return {
    subject: TimesheetEmailSubjects.FROZEN_EMPLOYEE,
    text: [
      `Hi ${fullName},`,
      '',
      `Your timesheet submission access has been frozen because the timesheet for ${weekLabel} was not submitted.`,
      'You can still log in and view data, but you cannot create or submit timesheets until your manager restores access.',
      '',
      '— PRM Tool',
    ].join('\n'),
  };
}

export function buildFreezeManagerEmail(
  managerName: string,
  employeeName: string,
  weekStart: Date,
): { subject: string; text: string } {
  const weekLabel = formatWeekRange(weekStart);
  return {
    subject: TimesheetEmailSubjects.FROZEN_MANAGER,
    text: [
      `Hi ${managerName},`,
      '',
      `${employeeName}'s timesheet submission access has been frozen for missing the week ${weekLabel}.`,
      'Please review and restore access from the manager console when appropriate.',
      '',
      '— PRM Tool',
    ].join('\n'),
  };
}

export function buildProjectAtRiskEmail(input: {
  managerName: string;
  projectName: string;
  healthLabel: string;
  riskSummary: string;
  suggestedHelp: string;
}): { subject: string; text: string } {
  return {
    subject: `${TimesheetEmailSubjects.PROJECT_AT_RISK}: ${input.projectName}`,
    text: [
      `Hi ${input.managerName},`,
      '',
      `Project "${input.projectName}" is currently ${input.healthLabel}.`,
      '',
      'AI risk summary:',
      input.riskSummary,
      '',
      'Suggested help:',
      input.suggestedHelp,
      '',
      '— PRM Tool',
    ].join('\n'),
  };
}
