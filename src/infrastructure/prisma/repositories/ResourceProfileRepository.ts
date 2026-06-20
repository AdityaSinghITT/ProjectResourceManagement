import { Prisma, ResourceStatus } from '@prisma/client';
import { prisma } from '../client';
import {
  AddUserSkillInput,
  AssignManagerInput,
  CreateResourceProfileInput,
  IResourceProfileRepository,
  ResourceProfileRecord,
  TeamMemberRecord,
  UpdateResourceProfileInput,
  UpdateUserSkillInput,
} from '../../../domain/interfaces/IResourceProfileRepository';
import {
  ActiveAllocationPreview,
  EmployeeListResult,
  EmployeeSkillView,
} from '../../../domain/types/admin.types';
import { RoleNames } from '../../../shared/constants/roleNames';
import { formatDateOnly, todayDateOnly } from '../../../shared/utils/date.utils';

const profileInclude = {
  user: { select: { fullName: true, department: true, designation: true, isActive: true } },
  manager: { select: { fullName: true } },
} as const;

function mapResourceProfileRecord(profile: {
  id: number;
  userId: number;
  managerId: number | null;
  resourceStatus: ResourceStatus;
  user: {
    fullName: string;
    department: ResourceProfileRecord['department'];
    designation: ResourceProfileRecord['designation'];
    isActive: boolean;
  };
  manager: { fullName: string } | null;
}): ResourceProfileRecord {
  return {
    id: profile.id,
    userId: profile.userId,
    managerId: profile.managerId,
    department: profile.user.department,
    designation: profile.user.designation,
    resourceStatus: profile.resourceStatus,
    isActive: profile.user.isActive,
    fullName: profile.user.fullName,
    managerName: profile.manager?.fullName ?? null,
  };
}

function mapTeamMember(profile: {
  id: number;
  userId: number;
  resourceStatus: ResourceStatus;
  user: {
    fullName: string;
    department: TeamMemberRecord['department'];
    designation: TeamMemberRecord['designation'];
    isActive: boolean;
  };
}): TeamMemberRecord {
  return {
    id: profile.id,
    userId: profile.userId,
    fullName: profile.user.fullName,
    department: profile.user.department,
    designation: profile.user.designation,
    resourceStatus: profile.resourceStatus,
    isActive: profile.user.isActive,
  };
}

function mapSkillView(skill: {
  id: number;
  skillId: number;
  category: EmployeeSkillView['category'];
  proficiency: EmployeeSkillView['proficiency'];
  skill: { name: string };
}): EmployeeSkillView {
  return {
    id: skill.id,
    skillId: skill.skillId,
    skillName: skill.skill.name,
    category: skill.category,
    proficiency: skill.proficiency,
  };
}

async function activeResourceWhere(): Promise<Prisma.ResourceProfileWhereInput> {
  const resourceRole = await prisma.role.findUnique({ where: { roleName: RoleNames.RESOURCE } });

  return {
    user: {
      isActive: true,
      ...(resourceRole
        ? {
            userRoles: {
              some: {
                roleId: resourceRole.id,
                isPrimary: true,
              },
            },
          }
        : {}),
    },
  };
}

async function teamMemberWhere(managerUserId: number): Promise<Prisma.ResourceProfileWhereInput> {
  return {
    ...(await activeResourceWhere()),
    managerId: managerUserId,
  };
}

export class PrismaResourceProfileRepository implements IResourceProfileRepository {
  async create(input: CreateResourceProfileInput): Promise<ResourceProfileRecord> {
    const profile = await prisma.resourceProfile.create({
      data: {
        userId: input.userId,
        managerId: null,
        resourceStatus: ResourceStatus.BENCH,
      },
      include: profileInclude,
    });

    return mapResourceProfileRecord(profile);
  }

  async assignManager(input: AssignManagerInput): Promise<ResourceProfileRecord> {
    const profile = await prisma.resourceProfile.update({
      where: { userId: input.resourceUserId },
      data: { managerId: input.managerUserId },
      include: profileInclude,
    });

    return mapResourceProfileRecord(profile);
  }

  async findById(resourceProfileId: number): Promise<ResourceProfileRecord | null> {
    const profile = await prisma.resourceProfile.findUnique({
      where: { id: resourceProfileId },
      include: profileInclude,
    });

    return profile ? mapResourceProfileRecord(profile) : null;
  }

  async findByUserId(userId: number): Promise<ResourceProfileRecord | null> {
    const profile = await prisma.resourceProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });

    return profile ? mapResourceProfileRecord(profile) : null;
  }

  async list(filters: {
    resourceStatus?: ResourceStatus;
    department?: ResourceProfileRecord['department'];
  }): Promise<EmployeeListResult> {
    const where: Prisma.ResourceProfileWhereInput = {
      user: {
        isActive: true,
        ...(filters.department ? { department: filters.department } : {}),
      },
      ...(filters.resourceStatus ? { resourceStatus: filters.resourceStatus } : {}),
    };

    const profiles = await prisma.resourceProfile.findMany({
      where,
      orderBy: { id: 'asc' },
      include: profileInclude,
    });

    const mapped = profiles.map(mapResourceProfileRecord);
    const allocated = mapped.filter((p) => p.resourceStatus === ResourceStatus.ALLOCATED).length;

    return {
      employees: mapped.map((profile) => ({
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        department: profile.department,
        designation: profile.designation,
        status: profile.resourceStatus,
        isActive: profile.isActive,
        managerId: profile.managerId,
        managerName: profile.managerName,
      })),
      summary: {
        total: mapped.length,
        allocated,
        bench: mapped.length - allocated,
      },
    };
  }

  async update(input: UpdateResourceProfileInput): Promise<ResourceProfileRecord> {
    const profile = await prisma.resourceProfile.findUniqueOrThrow({
      where: { id: input.resourceProfileId },
      select: { userId: true },
    });

    if (input.department !== undefined || input.designation !== undefined) {
      await prisma.user.update({
        where: { id: profile.userId },
        data: {
          ...(input.department !== undefined ? { department: input.department } : {}),
          ...(input.designation !== undefined ? { designation: input.designation } : {}),
        },
      });
    }

    const updated = await prisma.resourceProfile.findUniqueOrThrow({
      where: { id: input.resourceProfileId },
      include: profileInclude,
    });

    return mapResourceProfileRecord(updated);
  }

  async clearReportingManagerForTeam(managerUserId: number): Promise<number> {
    const result = await prisma.resourceProfile.updateMany({
      where: { managerId: managerUserId },
      data: { managerId: null },
    });

    return result.count;
  }

  async countTeamMembers(managerUserId: number): Promise<number> {
    return prisma.resourceProfile.count({
      where: await teamMemberWhere(managerUserId),
    });
  }

  async getActiveAllocations(resourceProfileId: number): Promise<ActiveAllocationPreview[]> {
    const today = todayDateOnly();

    const allocations = await prisma.allocation.findMany({
      where: {
        resourceProfileId,
        toDate: { gte: today },
      },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { fromDate: 'asc' },
    });

    return allocations.map((allocation) => ({
      projectId: allocation.project.id,
      projectName: allocation.project.name,
      utilizationPercent: allocation.utilizationPercent,
      fromDate: formatDateOnly(allocation.fromDate),
      toDate: formatDateOnly(allocation.toDate),
    }));
  }

  async endActiveAllocations(resourceProfileId: number, endDate: Date): Promise<void> {
    const today = todayDateOnly();

    await prisma.allocation.updateMany({
      where: {
        resourceProfileId,
        toDate: { gte: today },
      },
      data: { toDate: endDate },
    });
  }

  async listSkills(userId: number): Promise<EmployeeSkillView[]> {
    const skills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { id: 'asc' },
    });

    return skills.map(mapSkillView);
  }

  async addSkill(input: AddUserSkillInput): Promise<EmployeeSkillView> {
    const skill = await prisma.skill.upsert({
      where: { name: input.skillName },
      update: {},
      create: { name: input.skillName },
    });

    const userSkill = await prisma.userSkill.create({
      data: {
        userId: input.userId,
        skillId: skill.id,
        category: input.category,
        proficiency: input.proficiency,
      },
      include: { skill: true },
    });

    return mapSkillView(userSkill);
  }

  async updateSkill(input: UpdateUserSkillInput): Promise<EmployeeSkillView> {
    const userSkill = await prisma.userSkill.update({
      where: { id: input.userSkillId },
      data: { proficiency: input.proficiency },
      include: { skill: true },
    });

    return mapSkillView(userSkill);
  }

  async removeSkill(userSkillId: number): Promise<void> {
    await prisma.userSkill.delete({ where: { id: userSkillId } });
  }

  async findUserSkill(userSkillId: number): Promise<EmployeeSkillView | null> {
    const userSkill = await prisma.userSkill.findUnique({
      where: { id: userSkillId },
      include: { skill: true },
    });

    return userSkill ? mapSkillView(userSkill) : null;
  }

  async updateResourceStatus(
    resourceProfileId: number,
    resourceStatus: ResourceStatus,
  ): Promise<void> {
    await prisma.resourceProfile.update({
      where: { id: resourceProfileId },
      data: { resourceStatus },
    });
  }

  async findTeamMember(
    managerUserId: number,
    resourceProfileId: number,
  ): Promise<TeamMemberRecord | null> {
    const profile = await prisma.resourceProfile.findFirst({
      where: {
        id: resourceProfileId,
        ...(await teamMemberWhere(managerUserId)),
      },
      include: { user: { select: { fullName: true, department: true, designation: true, isActive: true } } },
    });

    return profile ? mapTeamMember(profile) : null;
  }

  async listTeamMembers(managerUserId: number): Promise<TeamMemberRecord[]> {
    const profiles = await prisma.resourceProfile.findMany({
      where: await teamMemberWhere(managerUserId),
      orderBy: { id: 'asc' },
      include: { user: { select: { fullName: true, department: true, designation: true, isActive: true } } },
    });

    return profiles.map(mapTeamMember);
  }

  async listOrganizationResources(): Promise<TeamMemberRecord[]> {
    const profiles = await prisma.resourceProfile.findMany({
      where: await activeResourceWhere(),
      orderBy: { id: 'asc' },
      include: { user: { select: { fullName: true, department: true, designation: true, isActive: true } } },
    });

    return profiles.map(mapTeamMember);
  }
}
