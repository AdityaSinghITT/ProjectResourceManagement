import { TimesheetComplianceState } from '@prisma/client';

export interface TimesheetComplianceCaseView {
  id: number;
  resourceProfileId: number;
  weekStart: string;
  state: TimesheetComplianceState;
  reminder1SentAt: string | null;
  reminder2SentAt: string | null;
  frozenAt: string | null;
}

export interface ResourceContactView {
  resourceProfileId: number;
  userId: number;
  fullName: string;
  email: string;
  managerId: number | null;
  managerName: string | null;
  managerEmail: string | null;
  timesheetSubmissionFrozen: boolean;
  timesheetFrozenForWeekStart: string | null;
}

export interface TimesheetComplianceSweepResult {
  scannedResources: number;
  reminder1Sent: number;
  reminder2Sent: number;
  frozenCount: number;
  resolvedCount: number;
}

/** Limit a sweep to specific profiles (e.g. notify.* test users). */
export interface TimesheetComplianceSweepOptions {
  resourceProfileIds?: number[];
}
