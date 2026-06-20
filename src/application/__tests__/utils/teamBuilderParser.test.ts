import { ProficiencyLevel } from '@prisma/client';
import { parseTeamBuilderResponse } from '../../utils/teamBuilderParser.utils';
import { TeamBuilderConstants } from '../../../shared/constants/teamBuilderConstants';
import { AppError } from '../../../shared/errors/AppError';

describe('parseTeamBuilderResponse', () => {
  it('parses valid team builder JSON', () => {
    const result = parseTeamBuilderResponse(
      JSON.stringify({
        roles: [
          {
            roleTitle: 'Senior Java Developer',
            status: TeamBuilderConstants.STATUS_FILLED,
            requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
            assignedEmployeeName: 'Priya Sharma',
            matchScore: 90,
            reason: 'Strong Java fit on bench.',
          },
          {
            roleTitle: 'QA Tester',
            status: TeamBuilderConstants.STATUS_GAP,
            requiredSkills: [{ skillName: 'Selenium', minProficiency: ProficiencyLevel.BEGINNER }],
            gap: {
              reasonType: TeamBuilderConstants.GAP_NO_SKILL,
              message: 'No employee has Selenium skills.',
            },
          },
        ],
      }),
    );

    expect(result).toHaveLength(2);
    expect(result[0].assignedEmployeeName).toBe('Priya Sharma');
    expect(result[1].gap?.reasonType).toBe(TeamBuilderConstants.GAP_NO_SKILL);
  });

  it('normalizes lowercase status and gap reasonType', () => {
    const result = parseTeamBuilderResponse(
      JSON.stringify({
        roles: [
          {
            roleTitle: 'DevOps Engineer',
            status: 'filled',
            requiredSkills: [{ skillName: 'Docker', minProficiency: ProficiencyLevel.INTERMEDIATE }],
            assignedEmployeeName: 'Alex Dev',
          },
          {
            roleTitle: 'QA Tester',
            status: 'gap',
            requiredSkills: [{ skillName: 'Selenium', minProficiency: ProficiencyLevel.BEGINNER }],
            gap: {
              reasonType: 'no_skill',
              message: 'No Selenium skills.',
            },
          },
        ],
      }),
    );

    expect(result[0].status).toBe(TeamBuilderConstants.STATUS_FILLED);
    expect(result[1].gap?.reasonType).toBe(TeamBuilderConstants.GAP_NO_SKILL);
  });

  it('parses markdown-wrapped JSON and root-level roles array', () => {
    const roles = [
      {
        roleTitle: 'Frontend Developer',
        status: TeamBuilderConstants.STATUS_GAP,
        requiredSkills: [{ skillName: 'React', minProficiency: ProficiencyLevel.INTERMEDIATE }],
        gap: {
          reasonType: TeamBuilderConstants.GAP_NO_SKILL,
          message: 'No bench frontend developers.',
        },
      },
    ];

    const fromFence = parseTeamBuilderResponse(`\`\`\`json\n${JSON.stringify({ roles })}\n\`\`\``);
    const fromArray = parseTeamBuilderResponse(JSON.stringify(roles));

    expect(fromFence).toHaveLength(1);
    expect(fromArray[0].roleTitle).toBe('Frontend Developer');
  });

  it('throws AppError on malformed JSON', () => {
    expect(() => parseTeamBuilderResponse('not json at all')).toThrow(AppError);
  });
});
