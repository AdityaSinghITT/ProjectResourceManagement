import { Screen } from '../../navigation/Screen';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { formatApiDateForDisplay } from '../../ui/formatters/dateFormatter';
import { formatHealthBadgeWithIcon } from '../../ui/formatters/healthBadge';
import { printApiError } from '../../ui/handleApiError';
import { AiStubScreen } from './AiStubScreen';

export const ManagerProjectsScreen: Screen = {
  name: 'ManagerProjectsScreen',

  async run(context) {
    console.clear();
    drawTitle('MY PROJECTS');

    try {
      const result = await context.manager.listProjects();

      if (result.projects.length === 0) {
        console.log('\nNo projects found.');
        await context.prompt.pause();
        return { type: 'back' };
      }

      printTable(
        ['#', 'Project', 'End Date', 'Health'],
        result.projects.map((project, index) => [
          String(index + 1),
          project.name,
          formatApiDateForDisplay(project.endDate),
          formatHealthBadgeWithIcon(project.healthStatus),
        ]),
      );

      const selection = await context.prompt.ask('\nSelect project number to view details (or B): ');
      if (selection.toUpperCase() === 'B') {
        return { type: 'back' };
      }

      const index = Number(selection) - 1;
      const project = result.projects[index];
      if (!project) {
        console.log('\nInvalid selection.');
        await context.prompt.pause();
        return { type: 'stay' };
      }

      const detail = await context.manager.getProjectDetail(project.id);
      console.clear();
      drawTitle(`── ${detail.project.name} ──`);
      console.log(`Health Status : ${formatHealthBadgeWithIcon(detail.health.healthStatus)}`);
      console.log(
        `\nHours evaluated for week: ${formatApiDateForDisplay(detail.health.evaluatedWeekStart)} – ${formatApiDateForDisplay(detail.health.evaluatedWeekEnd)}`,
      );

      if (detail.health.riskFlags.length === 0) {
        console.log('\nRisk Flags:\n  (none)');
      } else {
        console.log('\nRisk Flags:');
        for (const flag of detail.health.riskFlags) {
          console.log(`  x  ${flag.message}`);
        }
      }

      console.log('\nMilestones:');
      printTable(
        ['#', 'Title', 'Due Date', 'Status'],
        detail.milestones.milestones.map((milestone, milestoneIndex) => [
          String(milestoneIndex + 1),
          milestone.title,
          formatApiDateForDisplay(milestone.dueDate),
          milestone.status,
        ]),
      );

      console.log('\nAllocated Resources:');
      if (detail.allocations.length === 0) {
        console.log('  (none active today)');
      } else {
        printTable(
          ['Name', '%', 'From', 'To'],
          detail.allocations.map((allocation) => [
            allocation.employeeName,
            `${allocation.utilizationPercent}%`,
            formatApiDateForDisplay(allocation.fromDate),
            formatApiDateForDisplay(allocation.toDate),
          ]),
        );
      }

      const action = await context.prompt.ask('\n[A] Get AI Risk Summary (stub)     [B] Back\nChoice: ');
      if (action.toUpperCase() === 'A') {
        return { type: 'push', screen: AiStubScreen('AI Risk Summary') };
      }
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
    }

    return { type: 'back' };
  },
};
