import { EmployeeStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../client';
import {
  AddEmployeeSkillInput,
  AssignManagerInput,
  CreateEmployeeInput,
  EmployeeRecord,
  IEmployeeRepository,
  UpdateEmployeeInput,
  TeamMemberRecord,
  UpdateEmployeeSkillInput,
} from '../../../domain/interfaces/IEmployeeRepository';
import {
  ActiveAllocationPreview,
  EmployeeListResult,
  EmployeeSkillView,
} from '../../../domain/types/admin.types';
import { formatDateOnly, todayDateOnly } from '../../../shared/utils/date.utils';

const employeeInclude = {
  user: { select: { fullName: true } },
  manager: { select: { fullName: true } },
} as const;

function mapEmployeeRecord(employee: {
  id: number;
  userId: number;
  managerId: number | null;
  department: string;
  designation: string;
  status: EmployeeStatus;
  isActive: boolean;
  user: { fullName: string };
  manager: { fullName: string } | null;
}): EmployeeRecord {
  return {
    id: employee.id,
    userId: employee.userId,
    managerId: employee.managerId,
    department: employee.department,
    designation: employee.designation,
    status: employee.status,
    isActive: employee.isActive,
    fullName: employee.user.fullName,
    managerName: employee.manager?.fullName ?? null,
  };
}

function mapTeamMember(employee: {
  id: number;
  userId: number;
  department: string;
  designation: string;
  status: EmployeeStatus;
  isActive: boolean;
  user: { fullName: string };
}): TeamMemberRecord {
  return {
    id: employee.id,
    userId: employee.userId,
    fullName: employee.user.fullName,
    department: employee.department,
    designation: employee.designation,
    status: employee.status,
    isActive: employee.isActive,
  };
}

const teamMemberWhere = (managerUserId: number): Prisma.EmployeeWhereInput => ({
  managerId: managerUserId,
  isActive: true,
  user: { role: Role.EMPLOYEE, isActive: true },
});

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

export class PrismaEmployeeRepository implements IEmployeeRepository {
  async create(input: CreateEmployeeInput): Promise<EmployeeRecord> {
    const employee = await prisma.employee.create({
      data: {
        userId: input.userId,
        department: input.department,
        designation: input.designation,
        status: EmployeeStatus.BENCH,
        isActive: true,
      },
      include: employeeInclude,
    });

    return mapEmployeeRecord(employee);
  }

  async assignManager(input: AssignManagerInput): Promise<EmployeeRecord> {
    const employee = await prisma.employee.update({
      where: { userId: input.employeeUserId },
      data: { managerId: input.managerUserId },
      include: employeeInclude,
    });

    return mapEmployeeRecord(employee);
  }

  async findById(employeeId: number): Promise<EmployeeRecord | null> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: employeeInclude,
    });

    return employee ? mapEmployeeRecord(employee) : null;
  }

  async findByUserId(userId: number): Promise<EmployeeRecord | null> {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      include: employeeInclude,
    });

    return employee ? mapEmployeeRecord(employee) : null;
  }

  async list(filters: {
    status?: EmployeeStatus;
    department?: string;
  }): Promise<EmployeeListResult> {
    const where: Prisma.EmployeeWhereInput = {
      isActive: true,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.department
        ? { department: { equals: filters.department, mode: 'insensitive' } }
        : {}),
    };

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { id: 'asc' },
      include: employeeInclude,
    });

    const mapped = employees.map(mapEmployeeRecord);
    const allocated = mapped.filter((e) => e.status === EmployeeStatus.ALLOCATED).length;

    return {
      employees: mapped.map((employee) => ({
        id: employee.id,
        userId: employee.userId,
        fullName: employee.fullName,
        department: employee.department,
        designation: employee.designation,
        status: employee.status,
        isActive: employee.isActive,
        managerId: employee.managerId,
        managerName: employee.managerName,
      })),
      summary: {
        total: mapped.length,
        allocated,
        bench: mapped.length - allocated,
      },
    };
  }

  async update(input: UpdateEmployeeInput): Promise<EmployeeRecord> {
    const employee = await prisma.employee.update({
      where: { id: input.employeeId },
      data: {
        ...(input.department !== undefined ? { department: input.department } : {}),
        ...(input.designation !== undefined ? { designation: input.designation } : {}),
      },
      include: employeeInclude,
    });

    return mapEmployeeRecord(employee);
  }

  async deactivate(employeeId: number): Promise<EmployeeRecord> {
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: false },
      include: employeeInclude,
    });

    return mapEmployeeRecord(employee);
  }

  async clearReportingManagerForTeam(managerUserId: number): Promise<number> {
    const result = await prisma.employee.updateMany({
      where: { managerId: managerUserId },
      data: { managerId: null },
    });

    return result.count;
  }

  async countTeamMembers(managerUserId: number): Promise<number> {
    return prisma.employee.count({
      where: { managerId: managerUserId, isActive: true },
    });
  }

  async getActiveAllocations(employeeId: number): Promise<ActiveAllocationPreview[]> {
    const today = todayDateOnly();

    const allocations = await prisma.allocation.findMany({
      where: {
        employeeId,
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

  async endActiveAllocations(employeeId: number, endDate: Date): Promise<void> {
    const today = todayDateOnly();

    await prisma.allocation.updateMany({
      where: {
        employeeId,
        toDate: { gte: today },
      },
      data: { toDate: endDate },
    });
  }

  async listSkills(employeeId: number): Promise<EmployeeSkillView[]> {
    const skills = await prisma.employeeSkill.findMany({
      where: { employeeId },
      include: { skill: true },
      orderBy: { id: 'asc' },
    });

    return skills.map(mapSkillView);
  }

  async addSkill(input: AddEmployeeSkillInput): Promise<EmployeeSkillView> {
    const skill = await prisma.skill.upsert({
      where: { name: input.skillName },
      update: {},
      create: { name: input.skillName },
    });

    const employeeSkill = await prisma.employeeSkill.create({
      data: {
        employeeId: input.employeeId,
        skillId: skill.id,
        category: input.category,
        proficiency: input.proficiency,
      },
      include: { skill: true },
    });

    return mapSkillView(employeeSkill);
  }

  async updateSkill(input: UpdateEmployeeSkillInput): Promise<EmployeeSkillView> {
    const employeeSkill = await prisma.employeeSkill.update({
      where: { id: input.employeeSkillId },
      data: { proficiency: input.proficiency },
      include: { skill: true },
    });

    return mapSkillView(employeeSkill);
  }

  async removeSkill(employeeSkillId: number): Promise<void> {
    await prisma.employeeSkill.delete({ where: { id: employeeSkillId } });
  }

  async findEmployeeSkill(employeeSkillId: number): Promise<EmployeeSkillView | null> {
    const employeeSkill = await prisma.employeeSkill.findUnique({
      where: { id: employeeSkillId },
      include: { skill: true },
    });

    return employeeSkill ? mapSkillView(employeeSkill) : null;
  }

  async updateStatus(employeeId: number, status: EmployeeStatus): Promise<void> {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { status },
    });
  }

  async findTeamMember(managerUserId: number, employeeId: number): Promise<TeamMemberRecord | null> {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, ...teamMemberWhere(managerUserId) },
      include: { user: { select: { fullName: true } } },
    });

    return employee ? mapTeamMember(employee) : null;
  }

  async listTeamMembers(managerUserId: number): Promise<TeamMemberRecord[]> {
    const employees = await prisma.employee.findMany({
      where: teamMemberWhere(managerUserId),
      orderBy: { id: 'asc' },
      include: { user: { select: { fullName: true } } },
    });

    return employees.map(mapTeamMember);
  }
}
