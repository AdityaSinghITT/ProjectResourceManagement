import { TimesheetComplianceState } from '@prisma/client';
import { TimesheetComplianceCaseView } from '../types/timesheetCompliance.types';

export interface UpsertComplianceCaseInput {
  resourceProfileId: number;
  weekStart: Date;
  state: TimesheetComplianceState;
  reminder1SentAt?: Date | null;
  reminder2SentAt?: Date | null;
  frozenAt?: Date | null;
}

export interface ITimesheetComplianceRepository {
  findByResourceAndWeek(
    resourceProfileId: number,
    weekStart: Date,
  ): Promise<TimesheetComplianceCaseView | null>;
  upsert(input: UpsertComplianceCaseInput): Promise<TimesheetComplianceCaseView>;
  updateState(
    id: number,
    state: TimesheetComplianceState,
    timestamps?: {
      reminder1SentAt?: Date | null;
      reminder2SentAt?: Date | null;
      frozenAt?: Date | null;
    },
  ): Promise<TimesheetComplianceCaseView>;
}
