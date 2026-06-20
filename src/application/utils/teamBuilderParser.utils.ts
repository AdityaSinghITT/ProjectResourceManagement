import { ProficiencyLevel } from '@prisma/client';
import {
  TeamBuilderGap,
  TeamBuilderRoleResult,
  TeamBuilderSkillRequirement,
} from '../../domain/types/teamBuilder.types';
import { AiMessages } from '../../shared/constants/aiMessages';
import { TeamBuilderConstants } from '../../shared/constants/teamBuilderConstants';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { extractJsonArray, extractJsonObject } from './aiRequirement.utils';

const PROFICIENCY_LEVELS = new Set<string>(Object.values(ProficiencyLevel));

export function parseTeamBuilderResponse(llmText: string): TeamBuilderRoleResult[] {
  try {
    const rolesRaw = extractTeamBuilderRolesPayload(llmText);

    if (!Array.isArray(rolesRaw) || rolesRaw.length === 0) {
      throw new Error('Missing roles array');
    }

    return rolesRaw.map((row) => parseRoleRow(row));
  } catch {
    throw new AppError(
      HttpStatus.BAD_GATEWAY,
      AiMessages.INVALID_RESPONSE,
      ErrorTitles.SERVICE_UNAVAILABLE,
    );
  }
}

function parseRoleRow(row: unknown): TeamBuilderRoleResult {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid role row');
  }

  const record = row as Record<string, unknown>;
  const roleTitle = typeof record.roleTitle === 'string' ? record.roleTitle.trim() : '';
  const status = typeof record.status === 'string' ? record.status.trim().toUpperCase() : '';

  if (!roleTitle) {
    throw new Error('roleTitle is required');
  }

  const requiredSkills = parseRequiredSkills(record.requiredSkills, roleTitle);
  const gap = parseGap(record.gap);
  const matchScore =
    typeof record.matchScore === 'number' && Number.isFinite(record.matchScore)
      ? Math.round(record.matchScore)
      : null;

  return {
    roleTitle,
    requiredSkills,
    status,
    assignedEmployeeName:
      typeof record.assignedEmployeeName === 'string' ? record.assignedEmployeeName.trim() : null,
    matchScore,
    reason: typeof record.reason === 'string' ? record.reason.trim() : null,
    gap,
  };
}

function parseRequiredSkills(
  value: unknown,
  roleTitle: string,
): TeamBuilderSkillRequirement[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ skillName: roleTitle, minProficiency: ProficiencyLevel.INTERMEDIATE }];
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid requiredSkills entry');
    }

    const record = item as Record<string, unknown>;
    const skillName = typeof record.skillName === 'string' ? record.skillName.trim() : '';
    const minProficiency =
      typeof record.minProficiency === 'string' ? record.minProficiency.trim().toUpperCase() : '';

    if (!skillName || !PROFICIENCY_LEVELS.has(minProficiency)) {
      throw new Error('Invalid skill requirement');
    }

    return {
      skillName,
      minProficiency: minProficiency as ProficiencyLevel,
    };
  });
}

function parseGap(value: unknown): TeamBuilderGap | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!value || typeof value !== 'object') {
    throw new Error('Invalid gap object');
  }

  const record = value as Record<string, unknown>;
  const reasonType =
    typeof record.reasonType === 'string' ? record.reasonType.trim().toUpperCase() : '';
  const message = typeof record.message === 'string' ? record.message.trim() : '';

  if (!reasonType) {
    throw new Error('gap reasonType is required');
  }

  return {
    reasonType,
    message: message || 'No suitable match found.',
    alternativeEmployeeName:
      typeof record.alternativeEmployeeName === 'string'
        ? record.alternativeEmployeeName.trim()
        : null,
    availableFromDate:
      typeof record.availableFromDate === 'string' ? record.availableFromDate.trim() : null,
  };
}

export function isValidTeamBuilderStatus(status: string): boolean {
  return (
    status === TeamBuilderConstants.STATUS_FILLED || status === TeamBuilderConstants.STATUS_GAP
  );
}

export function isValidGapReason(reasonType: string): boolean {
  const normalized = reasonType.trim().toUpperCase();
  return (
    normalized === TeamBuilderConstants.GAP_NO_SKILL ||
    normalized === TeamBuilderConstants.GAP_ALLOCATED_ELSEWHERE
  );
}

function extractTeamBuilderRolesPayload(llmText: string): unknown[] {
  try {
    const payload = extractJsonObject(llmText);
    if (Array.isArray(payload.roles)) {
      return payload.roles;
    }
  } catch {
    // fall through
  }

  return extractJsonArray(llmText);
}
