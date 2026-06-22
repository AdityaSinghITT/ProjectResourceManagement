import { Department, Designation, MilestoneStatus, ProjectStatus, ResourceStatus } from '@prisma/client';
import { CreateProjectRequest } from '../../services/ProjectService';
import { CreateUserRequest } from '../../services/AdminUserService';
import { EmployeeListItem, MilestoneView, ProjectListItem } from '../../../domain/types/admin.types';
import { UserProfile, UserRecord } from '../../../domain/types/user.types';
import { RoleNames } from '../../../shared/constants/roleNames';

let sequence = 0;

export function nextTestSuffix(): string {
  sequence += 1;
  return `${Date.now()}_${sequence}`;
}

export function buildUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 1,
    username: 'test.user',
    email: 'test.user@example.com',
    fullName: 'Test User',
    role: RoleNames.ADMIN,
    department: null,
    designation: null,
    permissions: ['USERS:CREATE'],
    forcePasswordChange: true,
    ...overrides,
  };
}

export function buildUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    ...buildUserProfile(overrides),
    passwordHash: 'hashed-password',
    isActive: true,
    ...overrides,
  };
}

export function buildEmployeeListItem(overrides: Partial<EmployeeListItem> = {}): EmployeeListItem {
  return {
    id: 101,
    userId: 5,
    fullName: 'Resource User',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    status: ResourceStatus.BENCH,
    isActive: true,
    managerId: null,
    managerName: null,
    ...overrides,
  };
}

export function buildCreateUserRequest(overrides: Partial<CreateUserRequest> = {}): CreateUserRequest {
  const suffix = nextTestSuffix();
  return {
    username: `user_${suffix}`,
    email: `user_${suffix}@test.local`,
    fullName: 'New User',
    temporaryPassword: 'TempPass1',
    role: RoleNames.ADMIN,
    ...overrides,
  };
}

export function buildProjectListItem(overrides: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    id: 201,
    name: 'Alpha Portal',
    description: 'Customer portal rebuild',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: ProjectStatus.ACTIVE,
    managerId: 22,
    managerName: 'Ankit Shah',
    totalStoryPoints: 100,
    completedStoryPoints: 10,
    ...overrides,
  };
}

export function buildCreateProjectRequest(
  overrides: Partial<CreateProjectRequest> = {},
): CreateProjectRequest {
  return {
    name: 'New Project',
    description: 'Project description',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    status: ProjectStatus.PLANNED,
    managerId: 22,
    totalStoryPoints: 50,
    ...overrides,
  };
}

export function buildMilestoneView(overrides: Partial<MilestoneView> = {}): MilestoneView {
  return {
    id: 1,
    projectId: 201,
    title: 'MVP Release',
    dueDate: '2026-09-30',
    status: MilestoneStatus.NOT_STARTED,
    storyPoints: 20,
    sortOrder: 1,
    ...overrides,
  };
}

export function buildActiveManagerProfile(userId: number) {
  return {
    id: 10,
    userId,
    managerId: null,
    department: Department.ENGINEERING,
    designation: Designation.PROJECT_MANAGER,
    resourceStatus: ResourceStatus.BENCH,
    isActive: true,
    fullName: 'Manager User',
    managerName: null,
    timesheetSubmissionFrozen: false,
    timesheetFrozenForWeekStart: null,
  };
}
