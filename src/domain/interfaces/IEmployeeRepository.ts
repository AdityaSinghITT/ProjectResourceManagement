import { EmployeeStatus, ProficiencyLevel, SkillCategory } from '@prisma/client';
import { ActiveAllocationPreview, EmployeeListResult, EmployeeSkillView } from '../types/admin.types';

export interface CreateEmployeeInput {
  userId: number;
  department: string;
  designation: string;
}

export interface UpdateEmployeeInput {
  employeeId: number;
  department?: string;
  designation?: string;
}

export interface AddEmployeeSkillInput {
  employeeId: number;
  skillName: string;
  category: SkillCategory;
  proficiency: ProficiencyLevel;
}

export interface UpdateEmployeeSkillInput {
  employeeSkillId: number;
  proficiency: ProficiencyLevel;
}

export interface EmployeeRecord {
  id: number;
  userId: number;
  managerId: number | null;
  department: string;
  designation: string;
  status: EmployeeStatus;
  isActive: boolean;
  fullName: string;
  managerName: string | null;
}

export interface AssignManagerInput {
  employeeUserId: number;
  managerUserId: number;
}

export interface TeamMemberRecord {
  id: number;
  userId: number;
  fullName: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  isActive: boolean;
}

export interface IEmployeeRepository {
  create(input: CreateEmployeeInput): Promise<EmployeeRecord>;
  assignManager(input: AssignManagerInput): Promise<EmployeeRecord>;
  findById(employeeId: number): Promise<EmployeeRecord | null>;
  findByUserId(userId: number): Promise<EmployeeRecord | null>;
  list(filters: { status?: EmployeeStatus; department?: string }): Promise<EmployeeListResult>;
  update(input: UpdateEmployeeInput): Promise<EmployeeRecord>;
  deactivate(employeeId: number): Promise<EmployeeRecord>;
  clearReportingManagerForTeam(managerUserId: number): Promise<number>;
  countTeamMembers(managerUserId: number): Promise<number>;
  getActiveAllocations(employeeId: number): Promise<ActiveAllocationPreview[]>;
  endActiveAllocations(employeeId: number, endDate: Date): Promise<void>;
  listSkills(employeeId: number): Promise<EmployeeSkillView[]>;
  addSkill(input: AddEmployeeSkillInput): Promise<EmployeeSkillView>;
  updateSkill(input: UpdateEmployeeSkillInput): Promise<EmployeeSkillView>;
  removeSkill(employeeSkillId: number): Promise<void>;
  findEmployeeSkill(employeeSkillId: number): Promise<EmployeeSkillView | null>;
  updateStatus(employeeId: number, status: EmployeeStatus): Promise<void>;
  findTeamMember(managerUserId: number, employeeId: number): Promise<TeamMemberRecord | null>;
  listTeamMembers(managerUserId: number): Promise<TeamMemberRecord[]>;
}
