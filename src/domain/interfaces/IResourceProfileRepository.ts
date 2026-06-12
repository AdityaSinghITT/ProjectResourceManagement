import { Department, Designation, ProficiencyLevel, ResourceStatus, SkillCategory } from '@prisma/client';
import { ActiveAllocationPreview, EmployeeListResult, EmployeeSkillView } from '../types/admin.types';

export interface CreateResourceProfileInput {
  userId: number;
}

export interface UpdateResourceProfileInput {
  resourceProfileId: number;
  department?: Department;
  designation?: Designation;
}

export interface AddUserSkillInput {
  userId: number;
  skillName: string;
  category: SkillCategory;
  proficiency: ProficiencyLevel;
}

export interface UpdateUserSkillInput {
  userSkillId: number;
  proficiency: ProficiencyLevel;
}

export interface ResourceProfileRecord {
  id: number;
  userId: number;
  managerId: number | null;
  department: Department | null;
  designation: Designation | null;
  resourceStatus: ResourceStatus;
  isActive: boolean;
  fullName: string;
  managerName: string | null;
}

export interface AssignManagerInput {
  resourceUserId: number;
  managerUserId: number;
}

export interface TeamMemberRecord {
  id: number;
  userId: number;
  fullName: string;
  department: Department | null;
  designation: Designation | null;
  resourceStatus: ResourceStatus;
  isActive: boolean;
}

export interface IResourceProfileRepository {
  create(input: CreateResourceProfileInput): Promise<ResourceProfileRecord>;
  assignManager(input: AssignManagerInput): Promise<ResourceProfileRecord>;
  findById(resourceProfileId: number): Promise<ResourceProfileRecord | null>;
  findByUserId(userId: number): Promise<ResourceProfileRecord | null>;
  list(filters: {
    resourceStatus?: ResourceStatus;
    department?: Department;
  }): Promise<EmployeeListResult>;
  update(input: UpdateResourceProfileInput): Promise<ResourceProfileRecord>;
  clearReportingManagerForTeam(managerUserId: number): Promise<number>;
  countTeamMembers(managerUserId: number): Promise<number>;
  getActiveAllocations(resourceProfileId: number): Promise<ActiveAllocationPreview[]>;
  endActiveAllocations(resourceProfileId: number, endDate: Date): Promise<void>;
  listSkills(userId: number): Promise<EmployeeSkillView[]>;
  addSkill(input: AddUserSkillInput): Promise<EmployeeSkillView>;
  updateSkill(input: UpdateUserSkillInput): Promise<EmployeeSkillView>;
  removeSkill(userSkillId: number): Promise<void>;
  findUserSkill(userSkillId: number): Promise<EmployeeSkillView | null>;
  updateResourceStatus(resourceProfileId: number, resourceStatus: ResourceStatus): Promise<void>;
  findTeamMember(managerUserId: number, resourceProfileId: number): Promise<TeamMemberRecord | null>;
  listTeamMembers(managerUserId: number): Promise<TeamMemberRecord[]>;
  listOrganizationResources(): Promise<TeamMemberRecord[]>;
}
