import { TimesheetComplianceState } from '@prisma/client';
import { prisma } from '../client';
import {
  ITimesheetComplianceRepository,
  UpsertComplianceCaseInput,
} from '../../../domain/interfaces/ITimesheetComplianceRepository';
import { TimesheetComplianceCaseView } from '../../../domain/types/timesheetCompliance.types';
import { formatDateOnly } from '../../../shared/utils/date.utils';

function mapCase(record: {
  id: number;
  resourceProfileId: number;
  weekStart: Date;
  state: TimesheetComplianceState;
  reminder1SentAt: Date | null;
  reminder2SentAt: Date | null;
  frozenAt: Date | null;
}): TimesheetComplianceCaseView {
  return {
    id: record.id,
    resourceProfileId: record.resourceProfileId,
    weekStart: formatDateOnly(record.weekStart),
    state: record.state,
    reminder1SentAt: record.reminder1SentAt?.toISOString() ?? null,
    reminder2SentAt: record.reminder2SentAt?.toISOString() ?? null,
    frozenAt: record.frozenAt?.toISOString() ?? null,
  };
}

export class PrismaTimesheetComplianceRepository implements ITimesheetComplianceRepository {
  async findByResourceAndWeek(
    resourceProfileId: number,
    weekStart: Date,
  ): Promise<TimesheetComplianceCaseView | null> {
    const record = await prisma.timesheetComplianceCase.findUnique({
      where: {
        resourceProfileId_weekStart: {
          resourceProfileId,
          weekStart,
        },
      },
    });

    return record ? mapCase(record) : null;
  }

  async upsert(input: UpsertComplianceCaseInput): Promise<TimesheetComplianceCaseView> {
    const record = await prisma.timesheetComplianceCase.upsert({
      where: {
        resourceProfileId_weekStart: {
          resourceProfileId: input.resourceProfileId,
          weekStart: input.weekStart,
        },
      },
      create: {
        resourceProfileId: input.resourceProfileId,
        weekStart: input.weekStart,
        state: input.state,
        reminder1SentAt: input.reminder1SentAt ?? null,
        reminder2SentAt: input.reminder2SentAt ?? null,
        frozenAt: input.frozenAt ?? null,
      },
      update: {
        state: input.state,
        reminder1SentAt: input.reminder1SentAt,
        reminder2SentAt: input.reminder2SentAt,
        frozenAt: input.frozenAt,
      },
    });

    return mapCase(record);
  }

  async updateState(
    id: number,
    state: TimesheetComplianceState,
    timestamps?: {
      reminder1SentAt?: Date | null;
      reminder2SentAt?: Date | null;
      frozenAt?: Date | null;
    },
  ): Promise<TimesheetComplianceCaseView> {
    const record = await prisma.timesheetComplianceCase.update({
      where: { id },
      data: {
        state,
        ...(timestamps?.reminder1SentAt !== undefined
          ? { reminder1SentAt: timestamps.reminder1SentAt }
          : {}),
        ...(timestamps?.reminder2SentAt !== undefined
          ? { reminder2SentAt: timestamps.reminder2SentAt }
          : {}),
        ...(timestamps?.frozenAt !== undefined ? { frozenAt: timestamps.frozenAt } : {}),
      },
    });

    return mapCase(record);
  }
}
