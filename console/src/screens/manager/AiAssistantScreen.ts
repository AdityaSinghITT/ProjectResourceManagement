import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { NavigationResult } from '../../navigation/NavigationResult';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { formatHealthBadgeWithIcon } from '../../ui/formatters/healthBadge';
import { printApiError } from '../../ui/handleApiError';
import { TeamBuilderScreen } from './TeamBuilderScreen';

export const AiAssistantScreen: Screen = {
  name: 'AiAssistantScreen',

  async run(context) {
    console.clear();
    drawTitle('AI ASSISTANT');
    console.log('1. Skill Match    — Find best employees for a project requirement');
    console.log('2. Risk Summary   — Get a health analysis for a project');
    console.log('3. Team Builder   — Build a multi-role team from one NL prompt');
    console.log('4. Back\n');

    const choice = await context.prompt.ask('Enter option: ');

    switch (choice) {
      case '1':
        return runSkillMatch(context);
      case '2':
        return runRiskSummary(context);
      case '3':
        return TeamBuilderScreen.run(context);
      case '4':
        return { type: 'back' };
      default:
        console.log('\nInvalid option.');
        await context.prompt.pause();
        return { type: 'stay' };
    }
  },
};

async function runSkillMatch(context: AppContext): Promise<NavigationResult> {
  console.clear();
  drawTitle('SKILL MATCH');

  const requirement = await context.prompt.ask(
    '\nDescribe the requirement (skills, %, hours):\n> ',
  );

  if (!requirement.trim()) {
    console.log('\nRequirement cannot be empty.');
    await context.prompt.pause();
    return { type: 'stay' };
  }

  try {
    console.log('\nQuerying AI (this may take a moment)...');
    const result = await context.manager.skillMatch(requirement.trim());

    console.log(`\n${result.disclaimer}`);
    console.log(`Pre-filtered candidates: ${result.preFilteredCount}`);

    if (result.matches.length === 0) {
      console.log('\nNo matches returned. Try broadening the requirement or check team availability.');
    } else {
      console.log('\nSuggested matches:');
      printTable(
        ['#', 'Employee ID', 'Name', 'Reason'],
        result.matches.map((match, index) => [
          String(index + 1),
          String(match.resourceProfileId),
          match.fullName,
          match.reason,
        ]),
      );
    }
  } catch (error) {
    printApiError(error);
  }

  await context.prompt.pause();
  return { type: 'stay' };
}

async function runRiskSummary(context: AppContext): Promise<NavigationResult> {
  console.clear();
  drawTitle('AI RISK SUMMARY');

  try {
    const projects = await context.manager.listProjects();
    if (projects.projects.length === 0) {
      console.log('\nNo projects found.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    console.log('\nYour projects:');
    for (const project of projects.projects) {
      console.log(
        `  ${project.id}. ${project.name} — ${formatHealthBadgeWithIcon(project.healthStatus)}`,
      );
    }

    const projectId = Number(await context.prompt.ask('\nSelect Project ID: '));
    const selected = projects.projects.find((project) => project.id === projectId);
    if (!selected) {
      console.log('\nProject not found in your list.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    console.log('\nGenerating summary (this may take a moment)...');
    const result = await context.manager.projectRiskSummary(projectId);

    console.log(`\n${result.disclaimer}`);
    drawDivider();
    console.log(`Project: ${result.projectName}`);
    console.log(`Health  : ${formatHealthBadgeWithIcon(result.health.healthStatus)}`);
    drawDivider();
    console.log(`\n${result.summary}\n`);
  } catch (error) {
    printApiError(error);
  }

  await context.prompt.pause();
  return { type: 'stay' };
}
