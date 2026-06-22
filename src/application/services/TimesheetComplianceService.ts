import { TimesheetComplianceState, TimesheetStatus } from '@prisma/client';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IEmailSender } from '../../domain/interfaces/IEmailSender';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { ITimesheetComplianceRepository } from '../../domain/interfaces/ITimesheetComplianceRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import { TimesheetComplianceSweepOptions, TimesheetComplianceSweepResult } from '../../domain/types/timesheetCompliance.types';
import { TimesheetComplianceConstants } from '../../shared/constants/timesheetComplianceConstants';
import { appLogger } from '../../shared/logger/appLogger';
import { formatDateOnly } from '../../shared/utils/date.utils';
import {
  getNthWorkingDayAfter,
  isSameCalendarDay,
  isWorkingDay,
} from '../utils/workingDay.utils';
import { addDays, getWeekEnd, getWeekStart } from '../utils/week.utils';
import {
  buildFreezeEmployeeEmail,
  buildFreezeManagerEmail,
  buildReminder1Email,
  buildReminder2Email,
} from './EmailTemplateService';

export class TimesheetComplianceService {
  constructor(
    private readonly resourceProfileRepository: IResourceProfileRepository,
    private readonly allocationRepository: IAllocationRepository,
    private readonly timesheetRepository: ITimesheetRepository,
    private readonly complianceRepository: ITimesheetComplianceRepository,
    private readonly emailSender: IEmailSender,
  ) {}

  async runDailyCompliance(
    asOfDate: Date,
    options?: TimesheetComplianceSweepOptions,
  ): Promise<TimesheetComplianceSweepResult> {
    if (!isWorkingDay(asOfDate)) {
      return {
        scannedResources: 0,
        reminder1Sent: 0,
        reminder2Sent: 0,
        frozenCount: 0,
        resolvedCount: 0,
      };
    }

    const priorWeekStart = addDays(getWeekStart(asOfDate), -7);
    const priorWeekEnd = getWeekEnd(priorWeekStart);
    const deadlineAnchor = priorWeekEnd;

    const reminder1Day = getNthWorkingDayAfter(
      deadlineAnchor,
      TimesheetComplianceConstants.REMINDER_1_WORKING_DAY,
    );
    const reminder2Day = getNthWorkingDayAfter(
      deadlineAnchor,
      TimesheetComplianceConstants.REMINDER_2_WORKING_DAY,
    );
    const freezeDay = getNthWorkingDayAfter(
      deadlineAnchor,
      TimesheetComplianceConstants.FREEZE_WORKING_DAY,
    );

    const profileIdFilter = options?.resourceProfileIds
      ? new Set(options.resourceProfileIds)
      : null;

    const resources = await this.resourceProfileRepository.listActiveResources();
    const eligibleResources = profileIdFilter
      ? resources.filter((resource) => profileIdFilter.has(resource.id))
      : resources;

    const result: TimesheetComplianceSweepResult = {
      scannedResources: eligibleResources.length,
      reminder1Sent: 0,
      reminder2Sent: 0,
      frozenCount: 0,
      resolvedCount: 0,
    };

    for (const resource of eligibleResources) {
      if (!resource.isActive) {
        continue;
      }

      const allocations = await this.allocationRepository.listOverlappingViewsForResourceProfile(
        resource.id,
        priorWeekStart,
        priorWeekEnd,
      );

      if (allocations.length === 0) {
        continue;
      }

      const existingTimesheet = await this.timesheetRepository.findByResourceProfileAndWeek(
        resource.id,
        priorWeekStart,
      );

      if (existingTimesheet?.status === TimesheetStatus.SUBMITTED) {
        continue;
      }

      const complianceCase = await this.complianceRepository.findByResourceAndWeek(
        resource.id,
        priorWeekStart,
      );

      if (isSameCalendarDay(asOfDate, reminder1Day)) {
        const sent = await this.sendReminder1(
          resource.id,
          priorWeekStart,
          allocations.map((allocation) => allocation.projectId),
          complianceCase,
        );
        if (sent) {
          result.reminder1Sent += 1;
        }
        continue;
      }

      if (isSameCalendarDay(asOfDate, reminder2Day)) {
        const sent = await this.sendReminder2(resource.id, priorWeekStart, complianceCase);
        if (sent) {
          result.reminder2Sent += 1;
        }
        continue;
      }

      if (isSameCalendarDay(asOfDate, freezeDay)) {
        const frozen = await this.freezeResource(
          resource.id,
          priorWeekStart,
          allocations.map((allocation) => allocation.projectId),
          complianceCase,
        );
        if (frozen) {
          result.frozenCount += 1;
        }
      }
    }

    appLogger.info('Timesheet compliance sweep completed', { ...result });
    return result;
  }

  async resolveOnSubmit(resourceProfileId: number, weekStart: Date): Promise<void> {
    const complianceCase = await this.complianceRepository.findByResourceAndWeek(
      resourceProfileId,
      weekStart,
    );

    if (!complianceCase) {
      return;
    }

    if (
      complianceCase.state === TimesheetComplianceState.FROZEN ||
      complianceCase.state === TimesheetComplianceState.RESOLVED ||
      complianceCase.state === TimesheetComplianceState.CANCELLED
    ) {
      return;
    }

    await this.complianceRepository.updateState(complianceCase.id, TimesheetComplianceState.RESOLVED);
  }

  private async sendReminder1(
    resourceProfileId: number,
    weekStart: Date,
    projectIds: number[],
    existingCase: Awaited<ReturnType<ITimesheetComplianceRepository['findByResourceAndWeek']>>,
  ): Promise<boolean> {
    if (existingCase?.reminder1SentAt) {
      return false;
    }

    const contact = await this.resourceProfileRepository.findResourceContact(resourceProfileId);
    if (!contact) {
      return false;
    }

    const timesheet = await this.timesheetRepository.findByResourceProfileAndWeek(
      resourceProfileId,
      weekStart,
    );
    if (!timesheet) {
      await this.timesheetRepository.createPendingTimesheet({
        resourceProfileId,
        weekStart,
        projectIds,
      });
    }

    const now = new Date();
    if (existingCase) {
      await this.complianceRepository.updateState(existingCase.id, TimesheetComplianceState.REMINDER_1_SENT, {
        reminder1SentAt: now,
      });
    } else {
      await this.complianceRepository.upsert({
        resourceProfileId,
        weekStart,
        state: TimesheetComplianceState.REMINDER_1_SENT,
        reminder1SentAt: now,
      });
    }

    const email = buildReminder1Email(contact.fullName, weekStart);
    await this.emailSender.send({
      to: contact.email,
      subject: email.subject,
      text: email.text,
    });

    appLogger.info('Timesheet reminder 1 sent', {
      resourceProfileId,
      weekStart: formatDateOnly(weekStart),
    });

    return true;
  }

  private async sendReminder2(
    resourceProfileId: number,
    weekStart: Date,
    existingCase: Awaited<ReturnType<ITimesheetComplianceRepository['findByResourceAndWeek']>>,
  ): Promise<boolean> {
    if (!existingCase || existingCase.reminder2SentAt) {
      return false;
    }

    const timesheet = await this.timesheetRepository.findByResourceProfileAndWeek(
      resourceProfileId,
      weekStart,
    );
    if (timesheet?.status === TimesheetStatus.SUBMITTED) {
      return false;
    }

    const contact = await this.resourceProfileRepository.findResourceContact(resourceProfileId);
    if (!contact) {
      return false;
    }

    const now = new Date();
    await this.complianceRepository.updateState(existingCase.id, TimesheetComplianceState.REMINDER_2_SENT, {
      reminder2SentAt: now,
    });

    const email = buildReminder2Email(contact.fullName, weekStart);
    await this.emailSender.send({
      to: contact.email,
      subject: email.subject,
      text: email.text,
    });

    appLogger.info('Timesheet reminder 2 sent', {
      resourceProfileId,
      weekStart: formatDateOnly(weekStart),
    });

    return true;
  }

  private async freezeResource(
    resourceProfileId: number,
    weekStart: Date,
    projectIds: number[],
    existingCase: Awaited<ReturnType<ITimesheetComplianceRepository['findByResourceAndWeek']>>,
  ): Promise<boolean> {
    if (existingCase?.state === TimesheetComplianceState.FROZEN) {
      return false;
    }

    const timesheet = await this.timesheetRepository.findByResourceProfileAndWeek(
      resourceProfileId,
      weekStart,
    );
    if (timesheet?.status === TimesheetStatus.SUBMITTED) {
      return false;
    }

    const contact = await this.resourceProfileRepository.findResourceContact(resourceProfileId);
    if (!contact) {
      return false;
    }

    if (!timesheet) {
      await this.timesheetRepository.createPendingTimesheet({
        resourceProfileId,
        weekStart,
        projectIds,
      });
    }

    await this.timesheetRepository.promotePendingToMissed(resourceProfileId, weekStart);
    await this.resourceProfileRepository.setTimesheetFrozen(resourceProfileId, true, weekStart);

    const now = new Date();
    if (existingCase) {
      await this.complianceRepository.updateState(existingCase.id, TimesheetComplianceState.FROZEN, {
        frozenAt: now,
      });
    } else {
      await this.complianceRepository.upsert({
        resourceProfileId,
        weekStart,
        state: TimesheetComplianceState.FROZEN,
        frozenAt: now,
      });
    }

    const employeeEmail = buildFreezeEmployeeEmail(contact.fullName, weekStart);
    await this.emailSender.send({
      to: contact.email,
      subject: employeeEmail.subject,
      text: employeeEmail.text,
    });

    if (contact.managerEmail && contact.managerName) {
      const managerEmail = buildFreezeManagerEmail(
        contact.managerName,
        contact.fullName,
        weekStart,
      );
      await this.emailSender.send({
        to: contact.managerEmail,
        subject: managerEmail.subject,
        text: managerEmail.text,
      });
    }

    appLogger.info('Timesheet submission frozen', {
      resourceProfileId,
      weekStart: formatDateOnly(weekStart),
    });

    return true;
  }
}
