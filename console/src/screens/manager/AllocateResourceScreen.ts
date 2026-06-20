import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { NavigationResult } from '../../navigation/NavigationResult';
import { AllocationRequest } from '../../api/types/manager.types';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { parseDisplayDateToApi } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';

export const AllocateResourceScreen: Screen = {
  name: 'AllocateResourceScreen',

  async run(context) {
    console.clear();
    drawTitle('ALLOCATE RESOURCE');
    console.log('1. Find resource using AI (recommended)');
    console.log('2. Allocate directly (I already know who I want)');
    console.log('3. End an existing allocation');
    console.log('4. Back\n');

    const choice = await context.prompt.ask('Enter option: ');

    switch (choice) {
      case '1':
        return runAiAssistedAllocation(context);
      case '2':
        return runDirectAllocation(context);
      case '3':
        return runEndAllocation(context);
      case '4':
        return { type: 'back' };
      default:
        console.log('\nInvalid option.');
        await context.prompt.pause();
        return { type: 'stay' };
    }
  },
};

async function runAiAssistedAllocation(context: AppContext): Promise<NavigationResult> {
  console.clear();
  drawTitle('AI-ASSISTED ALLOCATION');

  const requirement = await context.prompt.ask(
    '\nDescribe who you need (skills, %, hours):\n> ',
  );

  if (!requirement.trim()) {
    console.log('\nRequirement cannot be empty.');
    await context.prompt.pause();
    return { type: 'stay' };
  }

  try {
    console.log('\nFinding matches (this may take a moment)...');
    const result = await context.manager.allocationsAiMatch(requirement.trim());

    console.log(`\n${result.disclaimer}`);
    console.log(`Pre-filtered candidates: ${result.preFilteredCount}`);

    if (result.matches.length === 0) {
      console.log('\nNo matches found. Try direct allocation or adjust the requirement.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    printTable(
      ['#', 'Employee ID', 'Name', 'Reason'],
      result.matches.map((match, index) => [
        String(index + 1),
        String(match.resourceProfileId),
        match.fullName,
        match.reason,
      ]),
    );

    const pick = await context.prompt.ask(
      '\nEnter match # to allocate (or B to go back): ',
    );
    if (pick.toUpperCase() === 'B') {
      return { type: 'stay' };
    }

    const matchIndex = Number(pick) - 1;
    const match = result.matches[matchIndex];
    if (!match) {
      console.log('\nInvalid selection.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    return runDirectAllocation(context, match.resourceProfileId);
  } catch (error) {
    printApiError(error);
    await context.prompt.pause();
    return { type: 'stay' };
  }
}

async function runDirectAllocation(
  context: AppContext,
  presetEmployeeId?: number,
): Promise<NavigationResult> {
  console.clear();
  drawTitle('DIRECT ALLOCATION');

  try {
    const projects = await context.manager.listProjects();
    console.log('\nYour projects:');
    for (const project of projects.projects) {
      console.log(`  ${project.id}. ${project.name}`);
    }

    const projectId = Number(await context.prompt.ask('\nSelect Project ID: '));
    const employeeId =
      presetEmployeeId ??
      Number(await context.prompt.ask('Enter Employee ID (resource profile ID from dashboard): '));
    const utilizationPercent = Number(await context.prompt.ask('Utilisation %   : '));
    const fromDateDisplay = await context.prompt.ask('From Date (DD-MM-YYYY): ');
    const toDateDisplay = await context.prompt.ask('To Date (DD-MM-YYYY)  : ');

    const body: AllocationRequest = {
      projectId,
      employeeId,
      utilizationPercent,
      fromDate: parseDisplayDateToApi(fromDateDisplay),
      toDate: parseDisplayDateToApi(toDateDisplay),
    };

    console.log('\nValidating...');
    const validation = await context.manager.validateAllocation(body);
    console.log(`  ${validation.message}`);

    if (!validation.valid) {
      await context.prompt.pause();
      return { type: 'stay' };
    }

    const confirm = await context.prompt.ask('\n[C] Confirm     [B] Back\nChoice: ');
    if (confirm.toUpperCase() !== 'C') {
      return { type: 'stay' };
    }

    const createResult = await context.manager.createAllocation(body);
    console.log(`\n${createResult.message}`);
  } catch (error) {
    printApiError(error);
  }

  await context.prompt.pause();
  return { type: 'stay' };
}

async function runEndAllocation(context: AppContext): Promise<NavigationResult> {
  console.clear();
  drawTitle('END ALLOCATION');

  try {
    const projects = await context.manager.listProjects();
    const projectId = Number(await context.prompt.ask('Select Project ID: '));
    const project = projects.projects.find((item) => item.id === projectId);
    if (!project) {
      console.log('\nProject not found in your list.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    const detail = await context.manager.getProjectDetail(projectId);
    if (detail.allocations.length === 0) {
      console.log('\nNo active allocations on this project.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    console.log(`\nActive Allocations on ${project.name}:`);
    printTable(
      ['#', 'Employee', '%', 'From', 'To', 'Alloc ID'],
      detail.allocations.map((allocation, index) => [
        String(index + 1),
        allocation.employeeName,
        `${allocation.utilizationPercent}%`,
        allocation.fromDate,
        allocation.toDate,
        String(allocation.id),
      ]),
    );

    const allocationId = Number(await context.prompt.ask('\nEnter allocation ID to end: '));
    const confirm = await context.prompt.ask('End this allocation now? [Y/N]: ');
    if (confirm.toUpperCase() !== 'Y') {
      return { type: 'stay' };
    }

    const result = await context.manager.endAllocation(allocationId);
    console.log(`\n${result.message}`);
  } catch (error) {
    printApiError(error);
  }

  await context.prompt.pause();
  return { type: 'stay' };
}
