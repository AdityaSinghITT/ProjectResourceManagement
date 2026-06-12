import { IAllocationRepository } from '../../domain/interfaces/IAllocationRepository';
import { IResourceProfileRepository } from '../../domain/interfaces/IResourceProfileRepository';
import { ITimesheetRepository } from '../../domain/interfaces/ITimesheetRepository';
import { TeamBuilderCandidate, TeamBuilderContext } from '../../domain/types/teamBuilder.types';
import { TimesheetRules } from '../../shared/constants/timesheetRules';
import { calculateAvailabilityPercent } from './allocationOverlap.util';
import { addDays, getWeekStart } from './week.utils';

export async function buildTeamBuilderContext(
  requirement: string,
  resourceProfileRepository: IResourceProfileRepository,
  allocationRepository: IAllocationRepository,
  timesheetRepository: ITimesheetRepository,
  asOfDate: Date,
): Promise<TeamBuilderContext> {
  const organizationResources = await resourceProfileRepository.listOrganizationResources();
  const allCandidates: TeamBuilderCandidate[] = [];

  for (const member of organizationResources) {
    if (!member.isActive) {
      continue;
    }

    const utilizationPercent = await allocationRepository.getCurrentUtilizationPercent(
      member.id,
      asOfDate,
    );
    const activeAllocationViews = await allocationRepository.listActiveViewsByResourceProfile(
      member.id,
      asOfDate,
    );
    const skills = await resourceProfileRepository.listSkills(member.userId);
    const sinceWeekStart = addDays(
      getWeekStart(asOfDate),
      -TimesheetRules.RECENT_ACTIVITY_WEEKS * TimesheetRules.DAYS_IN_WEEK,
    );
    const recentTags = await timesheetRepository.listRecentActivityTags(
      member.id,
      sinceWeekStart,
      8,
    );

    allCandidates.push({
      resourceProfileId: member.id,
      fullName: member.fullName,
      department: member.department,
      designation: member.designation,
      utilizationPercent,
      availabilityPercent: calculateAvailabilityPercent(utilizationPercent),
      skills: skills.map((skill) => ({
        name: skill.skillName,
        proficiency: skill.proficiency,
      })),
      recentActivityTags: recentTags.map((tag) => tag.label),
      activeAllocations: activeAllocationViews.map((allocation) => ({
        projectName: allocation.projectName,
        toDate: allocation.toDate,
      })),
    });
  }

  const assignableCandidates = allCandidates.filter(
    (candidate) => candidate.utilizationPercent === 0,
  );

  return {
    requirement,
    assignableCandidates,
    allCandidates,
  };
}

export function latestAllocationEndDate(
  candidate: TeamBuilderCandidate,
): string | null {
  if (candidate.activeAllocations.length === 0) {
    return null;
  }

  const sorted = [...candidate.activeAllocations].sort((left, right) =>
    right.toDate.localeCompare(left.toDate),
  );
  return sorted[0]?.toDate ?? null;
}

export function findCandidateByName(
  candidates: TeamBuilderCandidate[],
  fullName: string,
): TeamBuilderCandidate | undefined {
  const normalized = fullName.trim().toLowerCase();
  return candidates.find((candidate) => candidate.fullName.trim().toLowerCase() === normalized);
}
