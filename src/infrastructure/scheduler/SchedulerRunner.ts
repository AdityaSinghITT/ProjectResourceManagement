import { EmployeeStatusService } from '../../application/services/EmployeeStatusService';
import { MissedTimesheetService } from '../../application/services/MissedTimesheetService';
import { ISystemConfigRepository } from '../../domain/interfaces/ISystemConfigRepository';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { ProjectRiskNotificationService } from '../../application/services/ProjectRiskNotificationService';
import { TimesheetComplianceService } from '../../application/services/TimesheetComplianceService';
import { appLogger } from '../../shared/logger/appLogger';
import { todayDateOnly } from '../../shared/utils/date.utils';

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const DEFAULT_SCHEDULER_INTERVAL_HOURS = 4;

export class SchedulerRunner {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly employeeStatusService: EmployeeStatusService,
    private readonly missedTimesheetService: MissedTimesheetService,
    private readonly timesheetComplianceService: TimesheetComplianceService,
    private readonly projectRiskNotificationService: ProjectRiskNotificationService,
    private readonly systemConfigRepository: ISystemConfigRepository,
    private readonly resourceProfileRepository: IResourceProfileRepository,
  ) {}

  async start(): Promise<void> {
    if (this.intervalHandle) {
      return;
    }

    await this.runOnce();
    await this.scheduleNextInterval();

    appLogger.info('Background scheduler started');
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async runOnce(): Promise<void> {
    if (this.running) {
      appLogger.warn('Scheduler run skipped — previous run still in progress');
      return;
    }

    this.running = true;
    const asOfDate = todayDateOnly();

    try {
      appLogger.info('Scheduler run started', { asOfDate: asOfDate.toISOString() });

      const { employees } = await this.resourceProfileRepository.list({});
      for (const employee of employees) {
        await this.employeeStatusService.recomputeStatus(employee.id, asOfDate);
      }

      const complianceResult = await this.timesheetComplianceService.runDailyCompliance(asOfDate);
      const missedResult = await this.missedTimesheetService.flagMissedTimesheets(asOfDate);
      const riskResult = await this.projectRiskNotificationService.run(asOfDate);

      appLogger.info('Scheduler run completed', {
        resourcesUpdated: employees.length,
        compliance: complianceResult,
        missedTimesheetsCreated: missedResult.createdCount,
        projectRiskEmails: riskResult.emailsSent,
      });
    } catch (error) {
      appLogger.error('Scheduler run failed', { error });
      throw error;
    } finally {
      this.running = false;
    }
  }

  private async scheduleNextInterval(): Promise<void> {
    const config = await this.systemConfigRepository.get();
    const schedulerIntervalHours =
      config?.schedulerIntervalHours ?? DEFAULT_SCHEDULER_INTERVAL_HOURS;
    const intervalMs = schedulerIntervalHours * MILLISECONDS_PER_HOUR;

    this.intervalHandle = setInterval(() => {
      void this.runOnce().catch((error) => {
        appLogger.error('Scheduled run failed', { error });
      });
    }, intervalMs);

    appLogger.info('Scheduler interval configured', {
      schedulerIntervalHours,
      intervalMs,
    });
  }
}
