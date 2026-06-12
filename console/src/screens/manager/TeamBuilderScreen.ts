import { AppContext } from '../../app/AppContext';
import { TeamBuilderResult } from '../../api/types/manager.types';
import { Screen } from '../../navigation/Screen';
import { NavigationResult } from '../../navigation/NavigationResult';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { printApiError } from '../../ui/handleApiError';

const BANKING_PORTAL_EXAMPLE =
  'For a new banking portal we need a Senior Java Developer with advanced Java and intermediate Spring, ' +
  'a DevOps Engineer with intermediate Docker and beginner Kubernetes, and a QA Tester with ' +
  'intermediate manual testing and beginner Selenium.';

export const TeamBuilderScreen: Screen = {
  name: 'TeamBuilderScreen',

  async run(context) {
    return runTeamBuilder(context);
  },
};

async function runTeamBuilder(context: AppContext): Promise<NavigationResult> {
  console.clear();
  drawTitle('TEAM BUILDER WITH SKILL MATCH');

  console.log(
    '\nDescribe your team requirement in plain English (every role, skills, and proficiency).',
  );
  console.log('Press [E] then Enter to load the banking portal example, or type your own:\n');

  const firstInput = await context.prompt.ask('> ');
  const requirement =
    firstInput.trim().toUpperCase() === 'E' ? BANKING_PORTAL_EXAMPLE : firstInput.trim();

  if (!requirement) {
    console.log('\nRequirement cannot be empty.');
    await context.prompt.pause();
    return { type: 'stay' };
  }

  try {
    console.log('\nQuerying AI (this may take a moment)...');
    const result = await context.manager.teamBuilder(requirement);
    displayTeamBuilderResults(result);
  } catch (error) {
    printApiError(error);
  }

  await context.prompt.pause();
  return { type: 'stay' };
}

function displayTeamBuilderResults(result: TeamBuilderResult): void {
  console.log(`\n${result.disclaimer}`);
  console.log(
    `Assignable (100% available): ${result.assignableCount} / ${result.totalCandidateCount} org candidates`,
  );

  if (result.roles.length === 0) {
    console.log('\nNo roles returned. Try a more detailed requirement.');
    return;
  }

  drawDivider();
  console.log('TEAM BUILDER RESULTS');
  drawDivider();

  for (const role of result.roles) {
    console.log(`\nRole: ${role.roleTitle}`);
    console.log(
      `  Required: ${role.requiredSkills
        .map((skill) => `${skill.skillName} (${skill.minProficiency})`)
        .join(', ')}`,
    );
    console.log(`  Status: ${role.status}`);

    if (role.status === 'FILLED' && role.assignedEmployeeName) {
      const score = role.matchScore !== null && role.matchScore !== undefined ? role.matchScore : '—';
      console.log(`  Match:  ${role.assignedEmployeeName} (score ${score})`);
      if (role.reason) {
        console.log(`  Reason: ${role.reason}`);
      }
      continue;
    }

    if (role.gap) {
      console.log(`  Why:   ${role.gap.reasonType}`);
      console.log(`  Note:  ${role.gap.message}`);
      if (role.gap.alternativeEmployeeName) {
        console.log(`         Closest: ${role.gap.alternativeEmployeeName}`);
      }
      if (role.gap.availableFromDate) {
        console.log(`         Available from: ${role.gap.availableFromDate}`);
      }
    }
  }

  console.log('\nNote: AI-generated suggestions. No allocation performed.');
}
