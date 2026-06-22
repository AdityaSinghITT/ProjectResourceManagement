import { TimesheetComplianceState } from '@prisma/client';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { ITimesheetComplianceRepository } from '../../domain/interfaces/ITimesheetComplianceRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import { TimesheetMessages } from '../../shared/constants/timesheetMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { parseIsoDate } from '../../shared/utils/date.utils';
import { appLogger } from '../../shared/logger/appLogger';

export class TimesheetRestoreService {
  constructor(
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly timesheetRepository: ITimesheetRepository,
    private readonly complianceRepository: ITimesheetComplianceRepository,
  ) {}

  async restoreSubmissionAccess(
    managerUserId: number,
    resourceProfileId: number,
  ): Promise<{ message: string }> {
    const teamMember = await this.resourceProfileRepository.findTeamMember(
      managerUserId,
      resourceProfileId,
    );

    if (!teamMember) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        TimesheetMessages.EMPLOYEE_NOT_IN_TEAM,
        ErrorTitles.FORBIDDEN,
      );
    }

    const contact = await this.resourceProfileRepository.findResourceContact(resourceProfileId);
    if (!contact?.timesheetSubmissionFrozen) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        TimesheetMessages.NOT_FROZEN,
        ErrorTitles.BAD_REQUEST,
      );
    }

    if (contact.timesheetFrozenForWeekStart) {
      await this.timesheetRepository.deleteTimesheetForWeek(
        resourceProfileId,
        parseIsoDate(contact.timesheetFrozenForWeekStart),
      );

      const complianceCase = await this.complianceRepository.findByResourceAndWeek(
        resourceProfileId,
        parseIsoDate(contact.timesheetFrozenForWeekStart),
      );
      if (complianceCase) {
        await this.complianceRepository.updateState(
          complianceCase.id,
          TimesheetComplianceState.CANCELLED,
        );
      }
    }

    await this.resourceProfileRepository.setTimesheetFrozen(resourceProfileId, false, null);

    appLogger.info('Timesheet submission access restored', {
      managerUserId,
      resourceProfileId,
    });

    return { message: TimesheetMessages.RESTORE_SUCCESS };
  }
}
