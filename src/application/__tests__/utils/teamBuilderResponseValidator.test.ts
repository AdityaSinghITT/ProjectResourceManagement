import { ProficiencyLevel } from '@prisma/client';
import { TeamBuilderCandidate, TeamBuilderRoleResult } from '../../../domain/types/teamBuilder.types';
import { TeamBuilderConstants } from '../../../shared/constants/teamBuilderConstants';
import { AppError } from '../../../shared/errors/AppError';
import { validateTeamBuilderResponse } from '../../utils/teamBuilderResponseValidator';

const assignable: TeamBuilderCandidate[] = [
  {
    resourceProfileId: 1,
    fullName: 'Priya Sharma',
    department: null,
    designation: null,
    utilizationPercent: 0,
    availabilityPercent: 100,
    skills: [{ name: 'Java', proficiency: ProficiencyLevel.ADVANCED }],
    recentActivityTags: [],
    activeAllocations: [],
  },
  {
    resourceProfileId: 2,
    fullName: 'Karthik Menon',
    department: null,
    designation: null,
    utilizationPercent: 0,
    availabilityPercent: 100,
    skills: [{ name: 'Python', proficiency: ProficiencyLevel.ADVANCED }],
    recentActivityTags: [],
    activeAllocations: [],
  },
];

describe('validateTeamBuilderResponse', () => {
  it('accepts valid filled and gap roles', () => {
    const roles: TeamBuilderRoleResult[] = [
      {
        roleTitle: 'Java Dev',
        status: TeamBuilderConstants.STATUS_FILLED,
        requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
        assignedEmployeeName: 'Priya Sharma',
        matchScore: 90,
        reason: 'Match',
        gap: null,
      },
      {
        roleTitle: 'QA',
        status: TeamBuilderConstants.STATUS_GAP,
        requiredSkills: [{ skillName: 'Selenium', minProficiency: ProficiencyLevel.BEGINNER }],
        gap: {
          reasonType: TeamBuilderConstants.GAP_NO_SKILL,
          message: 'No skills',
        },
      },
    ];

    expect(() => validateTeamBuilderResponse(roles, assignable)).not.toThrow();
  });

  it('rejects duplicate filled assignments', () => {
    const roles: TeamBuilderRoleResult[] = [
      {
        roleTitle: 'Role A',
        status: TeamBuilderConstants.STATUS_FILLED,
        requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
        assignedEmployeeName: 'Priya Sharma',
        gap: null,
      },
      {
        roleTitle: 'Role B',
        status: TeamBuilderConstants.STATUS_FILLED,
        requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
        assignedEmployeeName: 'Priya Sharma',
        gap: null,
      },
    ];

    expect(() => validateTeamBuilderResponse(roles, assignable)).toThrow(AppError);
  });

  it('rejects assignee not in 100% available pool', () => {
    const roles: TeamBuilderRoleResult[] = [
      {
        roleTitle: 'Role A',
        status: TeamBuilderConstants.STATUS_FILLED,
        requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
        assignedEmployeeName: 'Allocated Person',
        gap: null,
      },
    ];

    expect(() => validateTeamBuilderResponse(roles, assignable)).toThrow(AppError);
  });

  it('rejects invalid gap reason', () => {
    const roles: TeamBuilderRoleResult[] = [
      {
        roleTitle: 'QA',
        status: TeamBuilderConstants.STATUS_GAP,
        requiredSkills: [{ skillName: 'Selenium', minProficiency: ProficiencyLevel.BEGINNER }],
        gap: {
          reasonType: 'UNKNOWN',
          message: 'Bad reason',
        },
      },
    ];

    expect(() => validateTeamBuilderResponse(roles, assignable)).toThrow(AppError);
  });
});
