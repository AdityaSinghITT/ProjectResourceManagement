import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { NavigationResult } from '../../navigation/NavigationResult';
import { AllocationRequest } from '../../api/types/manager.types';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { parseDisplayDateToApi } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';
import { AiStubScreen } from './AiStubScreen';

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
        return { type: 'push', screen: AiStubScreen('AI-assisted allocation') };
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

async function runDirectAllocation(context: AppContext): Promise<NavigationResult> {
  console.clear();
  drawTitle('DIRECT ALLOCATION');

  try {
    const projects = await context.manager.listProjects();
    console.log('\nYour projects:');
    for (const project of projects.projects) {
      console.log(`  ${project.id}. ${project.name}`);
    }

    const projectId = Number(await context.prompt.ask('\nSelect Project ID: '));
    const employeeId = Number(await context.prompt.ask('Enter Employee ID (employee table id from dashboard): '));
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

    const result = await context.manager.createAllocation(body);
    console.log(`\n${result.message}`);
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
