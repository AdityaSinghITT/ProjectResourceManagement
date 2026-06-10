import { EmployeeStatus, LlmProvider, TimesheetStatus } from '@prisma/client';
import { IActivityTagRepository } from '../../domain/interfaces/IActivityTagRepository';
import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IEmployeeRepository } from '../../domain/interfaces/IEmployeeRepository';
import { ISystemConfigRepository } from '../../domain/interfaces/ISystemConfigRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import { AppError } from '../../shared/errors/AppError';
import { HttpStatus } from '../../shared/constants/httpStatusCodes';
import { TimesheetMessages } from '../../shared/constants/timesheetMessages';
import { formatDateOnly, todayDateOnly } from '../../shared/utils/date.utils';
import { addDays, getWeekStart } from '../utils/week.utils';
import { TimesheetService } from './TimesheetService';

describe('TimesheetService', () => {
  const employee = {
    id: 3,
    userId: 14,
    managerId: 22,
    department: 'Engineering',
    designation: 'Developer',
    status: EmployeeStatus.ALLOCATED,
    isActive: true,
    fullName: 'Riya Patel',
    managerName: 'Manager One',
  };

  const weekStart = '2026-06-01';
  const weekEnd = '2026-06-07';

  const timesheetRepository: jest.Mocked<ITimesheetRepository> = {
    findByEmployeeAndWeek: jest.fn(),
    createWithEntries: jest.fn(),
    listHistoryByEmployee: jest.fn(),
    listRecentActivityTags: jest.fn(),
    listTeamEntriesForWeek: jest.fn(),
    listProjectHoursByEmployeeForWeek: jest.fn(),
  };

  const allocationRepository: jest.Mocked<IAllocationRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    endAllocation: jest.fn(),
    listAdmin: jest.fn(),
    listOverlappingForEmployee: jest.fn(),
    listActiveByEmployee: jest.fn(),
    getCurrentUtilizationPercent: jest.fn(),
    listActiveViewsByEmployee: jest.fn(),
    listOverlappingViewsForEmployee: jest.fn(),
    listOverlappingViewsForProject: jest.fn(),
  };

  const employeeRepository: jest.Mocked<IEmployeeRepository> = {
    create: jest.fn(),
    assignManager: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    clearReportingManagerForTeam: jest.fn(),
    countTeamMembers: jest.fn(),
    getActiveAllocations: jest.fn(),
    endActiveAllocations: jest.fn(),
    listSkills: jest.fn(),
    addSkill: jest.fn(),
    updateSkill: jest.fn(),
    removeSkill: jest.fn(),
    findEmployeeSkill: jest.fn(),
    updateStatus: jest.fn(),
    findTeamMember: jest.fn(),
    listTeamMembers: jest.fn(),
  };

  const systemConfigRepository: jest.Mocked<ISystemConfigRepository> = {
    get: jest.fn(),
    update: jest.fn(),
  };

  const activityTagRepository: jest.Mocked<IActivityTagRepository> = {
    listAll: jest.fn(),
    findByIds: jest.fn(),
    findByName: jest.fn(),
  };

  const service = new TimesheetService(
    timesheetRepository,
    allocationRepository,
    employeeRepository,
    systemConfigRepository,
    activityTagRepository,
  );

  const allocationViews = [
    {
      id: 1,
      employeeId: 3,
      employeeName: 'Riya Patel',
      projectId: 10,
      projectName: 'Portal Revamp',
      utilizationPercent: 50,
      fromDate: '2026-05-01',
      toDate: '2026-12-31',
    },
    {
      id: 2,
      employeeId: 3,
      employeeName: 'Riya Patel',
      projectId: 11,
      projectName: 'Mobile App',
      utilizationPercent: 50,
      fromDate: '2026-05-01',
      toDate: '2026-12-31',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    employeeRepository.findByUserId.mockResolvedValue(employee);
    systemConfigRepository.get.mockResolvedValue({
      llmProvider: LlmProvider.GEMINI,
      llmApiKeyMasked: '****',
      schedulerIntervalHours: 4,
      maxWeeklyHours: 40,
    });
    timesheetRepository.findByEmployeeAndWeek.mockResolvedValue(null);
    allocationRepository.listOverlappingViewsForEmployee.mockResolvedValue(allocationViews);
    activityTagRepository.findByIds.mockImplementation(async (tagIds) => {
      const catalog = [
        { id: 1, name: 'Backend API Development', sortOrder: 1 },
        { id: 11, name: 'Other', sortOrder: 11 },
      ];
      return catalog.filter((tag) => tagIds.includes(tag.id));
    });
    activityTagRepository.findByName.mockResolvedValue({ id: 11, name: 'Other', sortOrder: 11 });
  });

  it('submits 18 + 20 hours successfully for 50% + 50% allocations', async () => {
    timesheetRepository.createWithEntries.mockResolvedValue({
      id: 1,
      weekStart,
      weekEnd,
      status: TimesheetStatus.SUBMITTED,
      totalHours: 38,
      entries: [],
    });

    const result = await service.submit(employee.userId, weekStart, [
      {
        projectId: 10,
        hours: 18,
        tags: [{ activityTagId: 1 }],
      },
      {
        projectId: 11,
        hours: 20,
        tags: [{ activityTagId: 1 }],
      },
    ]);

    expect(result.message).toBe(TimesheetMessages.TIMESHEET_SUBMITTED);
    expect(timesheetRepository.createWithEntries).toHaveBeenCalled();
  });

  it('rejects hours above project allocation cap', async () => {
    await expect(
      service.submit(employee.userId, weekStart, [
        {
          projectId: 10,
          hours: 25,
          tags: [{ activityTagId: 1 }],
        },
      ]),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: expect.stringContaining('exceed the allocation cap'),
    });

    expect(timesheetRepository.createWithEntries).not.toHaveBeenCalled();
  });

  it('rejects duplicate submission for the same week', async () => {
    timesheetRepository.findByEmployeeAndWeek.mockResolvedValue({
      id: 9,
      weekStart,
      weekEnd,
      status: TimesheetStatus.SUBMITTED,
      totalHours: 20,
      entries: [],
    });

    await expect(
      service.submit(employee.userId, weekStart, [
        {
          projectId: 10,
          hours: 18,
          tags: [{ activityTagId: 1 }],
        },
      ]),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      message: TimesheetMessages.DUPLICATE_WEEK_SUBMISSION,
    });
  });

  it('rejects submission for a project not allocated in the week', async () => {
    await expect(
      service.submit(employee.userId, weekStart, [
        {
          projectId: 99,
          hours: 10,
          tags: [{ activityTagId: 1 }],
        },
      ]),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('rejects future week submission', async () => {
    const futureMonday = formatDateOnly(addDays(getWeekStart(todayDateOnly()), 7));

    await expect(
      service.submit(employee.userId, futureMonday, [
        {
          projectId: 10,
          hours: 10,
          tags: [{ activityTagId: 1 }],
        },
      ]),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: TimesheetMessages.FUTURE_WEEK_NOT_ALLOWED,
    });
  });

  it('requires customText when Other tag is used', async () => {
    await expect(
      service.submit(employee.userId, weekStart, [
        {
          projectId: 10,
          hours: 10,
          tags: [{ activityTagId: 11 }],
        },
      ]),
    ).rejects.toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: TimesheetMessages.CUSTOM_TEXT_REQUIRED_FOR_OTHER,
    });
  });

  it('builds employee allocation caps from overlapping allocations', async () => {
    const result = await service.getEmployeeAllocations(employee.userId, weekStart);

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].maxHoursForWeek).toBe(20);
    expect(result.allocations[1].maxHoursForWeek).toBe(20);
  });
});
