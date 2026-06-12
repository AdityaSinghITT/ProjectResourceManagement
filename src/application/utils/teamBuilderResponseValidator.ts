import { TeamBuilderCandidate, TeamBuilderRoleResult } from '../../domain/types/teamBuilder.types';
import { AiMessages } from '../../shared/constants/aiMessages';
import { TeamBuilderConstants } from '../../shared/constants/teamBuilderConstants';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { findCandidateByName } from './teamBuilderContext.utils';
import { isValidGapReason, isValidTeamBuilderStatus } from './teamBuilderParser.utils';

// Post-LLM validation: the model may violate no-duplicate or assignable-pool rules despite prompt instructions.
export function validateTeamBuilderResponse(
  roles: TeamBuilderRoleResult[],
  assignableCandidates: TeamBuilderCandidate[],
): void {
  if (roles.length === 0) {
    throw invalidResponseError();
  }

  const assignableNames = new Set(
    assignableCandidates.map((candidate) => candidate.fullName.trim().toLowerCase()),
  );
  const filledNames = new Set<string>();

  for (const role of roles) {
    if (!isValidTeamBuilderStatus(role.status)) {
      throw invalidResponseError();
    }

    if (role.status === TeamBuilderConstants.STATUS_FILLED) {
      validateFilledRole(role, assignableNames, filledNames);
      continue;
    }

    validateGapRole(role);
  }
}

function validateFilledRole(
  role: TeamBuilderRoleResult,
  assignableNames: Set<string>,
  filledNames: Set<string>,
): void {
  const name = role.assignedEmployeeName?.trim();
  if (!name) {
    throw invalidResponseError();
  }

  const normalized = name.toLowerCase();
  if (!assignableNames.has(normalized)) {
    throw invalidResponseError();
  }

  if (filledNames.has(normalized)) {
    throw invalidResponseError();
  }

  filledNames.add(normalized);

  if (role.gap) {
    throw invalidResponseError();
  }
}

function validateGapRole(role: TeamBuilderRoleResult): void {
  if (role.assignedEmployeeName?.trim()) {
    throw invalidResponseError();
  }

  if (!role.gap || !isValidGapReason(role.gap.reasonType)) {
    throw invalidResponseError();
  }
}

function invalidResponseError(): AppError {
  return new AppError(
    HttpStatus.BAD_GATEWAY,
    AiMessages.INVALID_RESPONSE,
    ErrorTitles.SERVICE_UNAVAILABLE,
  );
}

export function enrichGapRolesWithCandidateDates(
  roles: TeamBuilderRoleResult[],
  allCandidates: TeamBuilderCandidate[],
): TeamBuilderRoleResult[] {
  return roles.map((role) => {
    if (role.status !== TeamBuilderConstants.STATUS_GAP || !role.gap) {
      return role;
    }

    if (role.gap.reasonType !== TeamBuilderConstants.GAP_ALLOCATED_ELSEWHERE) {
      return role;
    }

    const alternativeName = role.gap.alternativeEmployeeName?.trim();
    if (!alternativeName) {
      return role;
    }

    const candidate = findCandidateByName(allCandidates, alternativeName);
    if (!candidate || candidate.activeAllocations.length === 0) {
      return role;
    }

    const sorted = [...candidate.activeAllocations].sort((left, right) =>
      right.toDate.localeCompare(left.toDate),
    );
    const latestEnd = sorted[0]?.toDate ?? role.gap.availableFromDate ?? null;

    return {
      ...role,
      gap: {
        ...role.gap,
        availableFromDate: role.gap.availableFromDate ?? latestEnd,
      },
    };
  });
}
