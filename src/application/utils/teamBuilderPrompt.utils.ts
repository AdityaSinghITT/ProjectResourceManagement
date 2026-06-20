import { TeamBuilderCandidate } from '../../domain/types/teamBuilder.types';
import { TeamBuilderConstants } from '../../shared/constants/teamBuilderConstants';

export function buildTeamBuilderPrompt(
  requirement: string,
  assignableCandidates: TeamBuilderCandidate[],
  allCandidates: TeamBuilderCandidate[],
): string {
  const { STATUS_FILLED, STATUS_GAP, GAP_NO_SKILL, GAP_ALLOCATED_ELSEWHERE } = TeamBuilderConstants;

  return [
    'You are an IT resource planning assistant for team building.',
    'Read the manager natural-language team requirement and complete BOTH phases in one response.',
    '',
    'Phase A — Parse requirement:',
    '1. Extract each distinct role from the requirement text.',
    '2. For each role infer required skills and minimum proficiency: BEGINNER, INTERMEDIATE, or ADVANCED.',
    '3. Map informal terms: beginner -> BEGINNER, intermediate -> INTERMEDIATE, advanced/senior -> ADVANCED.',
    '4. Default to INTERMEDIATE when proficiency is not stated.',
    '5. If no skills are inferable, use the role title as a skill hint.',
    '6. Ignore bandwidth/duration hints for availability — they describe the ask, not bench status.',
    '',
    'Phase B — Match (single pass):',
    `1. Fill roles ONLY from assignableCandidates (${STATUS_FILLED} means 0% utilization / 100% available).`,
    '2. Never assign the same employee to two roles.',
    '3. For assignedEmployeeName copy the exact fullName string from assignableCandidates JSON.',
    '4. Match skills case-insensitively; proficiency order: BEGINNER < INTERMEDIATE < ADVANCED.',
    '5. Prefer higher proficiency and designation fit when multiple candidates qualify.',
    `6. For unfilled roles set status "${STATUS_GAP}" (uppercase) with a gap object and reasonType:`,
    `   - "${GAP_NO_SKILL}": no org employee has all required skills at minimum proficiency.`,
    `   - "${GAP_ALLOCATED_ELSEWHERE}": skilled employee exists but is not 100% available;`,
    '     name the closest match in alternativeEmployeeName and set availableFromDate (yyyy-MM-dd)',
    '     from their latest activeAllocations toDate in allCandidates data.',
    '7. Echo requiredSkills on every role result.',
    '8. Use ONLY people from the candidate JSON. Do not invent employees.',
    '9. Return ONLY strict JSON (no markdown fences) in this shape:',
    '{"roles":[{"roleTitle":"...","status":"FILLED|GAP","requiredSkills":[{"skillName":"...","minProficiency":"BEGINNER|INTERMEDIATE|ADVANCED"}],',
    '"assignedEmployeeName":"...","matchScore":90,"reason":"...","gap":{"reasonType":"NO_SKILL|ALLOCATED_ELSEWHERE","message":"...","alternativeEmployeeName":"...","availableFromDate":"yyyy-MM-dd"}}]}',
    '',
    `Requirement: ${requirement}`,
    '',
    `assignableCandidates JSON: ${JSON.stringify(assignableCandidates)}`,
    '',
    `allCandidates JSON: ${JSON.stringify(allCandidates)}`,
  ].join('\n');
}
