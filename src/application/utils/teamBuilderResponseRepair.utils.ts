import {
  TeamBuilderCandidate,
  TeamBuilderGap,
  TeamBuilderRoleResult,
} from '../../domain/types/teamBuilder.types';
import { TeamBuilderConstants } from '../../shared/constants/teamBuilderConstants';
import { findCandidateByName, latestAllocationEndDate } from './teamBuilderContext.utils';
import { isValidGapReason } from './teamBuilderParser.utils';

export function repairTeamBuilderRoles(
  roles: TeamBuilderRoleResult[],
  assignableCandidates: TeamBuilderCandidate[],
  allCandidates: TeamBuilderCandidate[],
): TeamBuilderRoleResult[] {
  const filledNames = new Set<string>();
  const repaired: TeamBuilderRoleResult[] = [];

  for (const role of roles) {
    const normalizedStatus = role.status.trim().toUpperCase();
    const wantsFilled = normalizedStatus === TeamBuilderConstants.STATUS_FILLED;

    if (wantsFilled && role.assignedEmployeeName?.trim()) {
      const assignable = findCandidateByName(assignableCandidates, role.assignedEmployeeName);
      const normalizedName = assignable?.fullName.toLowerCase();

      if (assignable && normalizedName && !filledNames.has(normalizedName)) {
        filledNames.add(normalizedName);
        repaired.push({
          ...role,
          status: TeamBuilderConstants.STATUS_FILLED,
          assignedEmployeeName: assignable.fullName,
          gap: null,
        });
        continue;
      }

      const allocatedCandidate = findCandidateByName(allCandidates, role.assignedEmployeeName);
      if (allocatedCandidate && allocatedCandidate.utilizationPercent > 0) {
        repaired.push(toAllocatedElsewhereGap(role, allocatedCandidate));
        continue;
      }

      repaired.push(toNoSkillGap(role));
      continue;
    }

    repaired.push(normalizeGapRole(role, allCandidates));
  }

  return repaired;
}

function normalizeGapRole(
  role: TeamBuilderRoleResult,
  allCandidates: TeamBuilderCandidate[],
): TeamBuilderRoleResult {
  const gap = normalizeGap(role.gap, role, allCandidates);

  return {
    ...role,
    status: TeamBuilderConstants.STATUS_GAP,
    assignedEmployeeName: null,
    matchScore: null,
    gap,
  };
}

function normalizeGap(
  gap: TeamBuilderGap | null | undefined,
  role: TeamBuilderRoleResult,
  allCandidates: TeamBuilderCandidate[],
): TeamBuilderGap {
  if (gap) {
    const reasonType = gap.reasonType.trim().toUpperCase();
    const normalizedReason = isValidGapReason(reasonType)
      ? reasonType
      : TeamBuilderConstants.GAP_NO_SKILL;

    let availableFromDate = gap.availableFromDate ?? null;
    if (gap.alternativeEmployeeName) {
      const candidate = findCandidateByName(allCandidates, gap.alternativeEmployeeName);
      availableFromDate = availableFromDate ?? (candidate ? latestAllocationEndDate(candidate) : null);
    }

    return {
      reasonType: normalizedReason,
      message: gap.message.trim() || defaultGapMessage(role.roleTitle, normalizedReason),
      alternativeEmployeeName: gap.alternativeEmployeeName?.trim() ?? null,
      availableFromDate,
    };
  }

  return {
    reasonType: TeamBuilderConstants.GAP_NO_SKILL,
    message: role.reason?.trim() || defaultGapMessage(role.roleTitle, TeamBuilderConstants.GAP_NO_SKILL),
    alternativeEmployeeName: null,
    availableFromDate: null,
  };
}

function toNoSkillGap(role: TeamBuilderRoleResult): TeamBuilderRoleResult {
  return {
    ...role,
    status: TeamBuilderConstants.STATUS_GAP,
    assignedEmployeeName: null,
    matchScore: null,
    gap: {
      reasonType: TeamBuilderConstants.GAP_NO_SKILL,
      message:
        role.reason?.trim() ||
        `No 100% available employee matches ${role.roleTitle}. Consider hiring or training.`,
      alternativeEmployeeName: null,
      availableFromDate: null,
    },
  };
}

function toAllocatedElsewhereGap(
  role: TeamBuilderRoleResult,
  candidate: TeamBuilderCandidate,
): TeamBuilderRoleResult {
  return {
    ...role,
    status: TeamBuilderConstants.STATUS_GAP,
    assignedEmployeeName: null,
    matchScore: null,
    gap: {
      reasonType: TeamBuilderConstants.GAP_ALLOCATED_ELSEWHERE,
      message:
        role.reason?.trim() ||
        `${candidate.fullName} has relevant skills but is not 100% available.`,
      alternativeEmployeeName: candidate.fullName,
      availableFromDate: latestAllocationEndDate(candidate),
    },
  };
}

function defaultGapMessage(roleTitle: string, reasonType: string): string {
  if (reasonType === TeamBuilderConstants.GAP_ALLOCATED_ELSEWHERE) {
    return `Skilled employees exist for ${roleTitle} but none are 100% available.`;
  }

  return `No suitable 100% available employee for ${roleTitle}.`;
}
