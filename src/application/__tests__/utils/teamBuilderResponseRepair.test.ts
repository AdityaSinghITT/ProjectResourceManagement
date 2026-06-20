import { ProficiencyLevel } from '@prisma/client';
import { TeamBuilderCandidate } from '../../../domain/types/teamBuilder.types';
import { TeamBuilderConstants } from '../../../shared/constants/teamBuilderConstants';
import { repairTeamBuilderRoles } from '../../utils/teamBuilderResponseRepair.utils';

describe('repairTeamBuilderRoles', () => {
  const assignable: TeamBuilderCandidate[] = [
    {
      resourceProfileId: 1,
      fullName: 'Priya Sharma',
      department: 'ENGINEERING',
      designation: 'SOFTWARE_ENGINEER',
      utilizationPercent: 0,
      availabilityPercent: 100,
      skills: [{ name: 'Java', proficiency: ProficiencyLevel.ADVANCED }],
      recentActivityTags: [],
      activeAllocations: [],
    },
  ];

  const allocated: TeamBuilderCandidate[] = [
    {
      resourceProfileId: 2,
      fullName: 'Ravi Kumar',
      department: 'ENGINEERING',
      designation: 'SOFTWARE_ENGINEER',
      utilizationPercent: 50,
      availabilityPercent: 50,
      skills: [{ name: 'DevOps', proficiency: ProficiencyLevel.INTERMEDIATE }],
      recentActivityTags: [],
      activeAllocations: [{ projectName: 'Alpha', toDate: '2026-09-30' }],
    },
  ];

  const allCandidates = [...assignable, ...allocated];

  it('keeps valid filled roles on the assignable bench', () => {
    const repaired = repairTeamBuilderRoles(
      [
        {
          roleTitle: 'Java Developer',
          status: TeamBuilderConstants.STATUS_FILLED,
          requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
          assignedEmployeeName: 'Priya Sharma',
          matchScore: 90,
          reason: 'Bench fit.',
          gap: null,
        },
      ],
      assignable,
      allCandidates,
    );

    expect(repaired[0].status).toBe(TeamBuilderConstants.STATUS_FILLED);
    expect(repaired[0].assignedEmployeeName).toBe('Priya Sharma');
  });

  it('downgrades invalid filled roles to gap', () => {
    const repaired = repairTeamBuilderRoles(
      [
        {
          roleTitle: 'DevOps Engineer',
          status: TeamBuilderConstants.STATUS_FILLED,
          requiredSkills: [{ skillName: 'DevOps', minProficiency: ProficiencyLevel.INTERMEDIATE }],
          assignedEmployeeName: 'Ravi Kumar',
          matchScore: 80,
          reason: 'Has DevOps skills.',
          gap: null,
        },
      ],
      assignable,
      allCandidates,
    );

    expect(repaired[0].status).toBe(TeamBuilderConstants.STATUS_GAP);
    expect(repaired[0].gap?.reasonType).toBe(TeamBuilderConstants.GAP_ALLOCATED_ELSEWHERE);
    expect(repaired[0].gap?.alternativeEmployeeName).toBe('Ravi Kumar');
  });

  it('converts duplicate filled assignments into gap roles', () => {
    const repaired = repairTeamBuilderRoles(
      [
        {
          roleTitle: 'Role A',
          status: TeamBuilderConstants.STATUS_FILLED,
          requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
          assignedEmployeeName: 'Priya Sharma',
          matchScore: null,
          reason: null,
          gap: null,
        },
        {
          roleTitle: 'Role B',
          status: TeamBuilderConstants.STATUS_FILLED,
          requiredSkills: [{ skillName: 'Java', minProficiency: ProficiencyLevel.ADVANCED }],
          assignedEmployeeName: 'Priya Sharma',
          matchScore: null,
          reason: null,
          gap: null,
        },
      ],
      assignable,
      allCandidates,
    );

    expect(repaired[0].status).toBe(TeamBuilderConstants.STATUS_FILLED);
    expect(repaired[1].status).toBe(TeamBuilderConstants.STATUS_GAP);
  });
});
