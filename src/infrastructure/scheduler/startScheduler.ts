import { EmployeeStatusService } from '../../application/services/EmployeeStatusService';
import { MissedTimesheetService } from '../../application/services/MissedTimesheetService';
import { PrismaAllocationRepository } from '../prisma/repositories/AllocationRepository';
import { PrismaResourceProfileRepository } from '../prisma/repositories/ResourceProfileRepository';
import { PrismaSystemConfigRepository } from '../prisma/repositories/SystemConfigRepository';
import { PrismaTimesheetRepository } from '../prisma/repositories/TimesheetRepository';
import { SchedulerRunner } from './SchedulerRunner';

export async function startScheduler(): Promise<SchedulerRunner> {
  const resourceProfileRepository = new PrismaResourceProfileRepository();
  const allocationRepository = new PrismaAllocationRepository();
  const timesheetRepository = new PrismaTimesheetRepository();
  const systemConfigRepository = new PrismaSystemConfigRepository();

  const employeeStatusService = new EmployeeStatusService(
    resourceProfileRepository,
    allocationRepository,
  );
  const missedTimesheetService = new MissedTimesheetService(
    resourceProfileRepository,
    allocationRepository,
    timesheetRepository,
  );

  const runner = new SchedulerRunner(
    employeeStatusService,
    missedTimesheetService,
    systemConfigRepository,
    resourceProfileRepository,
  );

  await runner.start();
  return runner;
}
