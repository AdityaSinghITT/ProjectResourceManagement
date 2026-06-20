import { z } from 'zod';
import { AiValidationLimits } from '../../shared/constants/aiValidationLimits';

export const skillMatchSchema = z.object({
  requirement: z
    .string()
    .trim()
    .min(
      AiValidationLimits.MIN_SKILL_MATCH_REQUIREMENT_LENGTH,
      'Requirement must be at least 3 characters',
    ),
});

export const teamBuilderSchema = z.object({
  requirement: z
    .string()
    .trim()
    .min(
      AiValidationLimits.MIN_SKILL_MATCH_REQUIREMENT_LENGTH,
      'Requirement must be at least 3 characters',
    )
    .max(
      AiValidationLimits.MAX_TEAM_BUILDER_REQUIREMENT_LENGTH,
      `Requirement must be at most ${AiValidationLimits.MAX_TEAM_BUILDER_REQUIREMENT_LENGTH} characters`,
    ),
});
