import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { formatApiDateForDisplay } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';

export const ViewAllocationsScreen: Screen = {
  name: 'ViewAllocationsScreen',

  async run(context) {
    console.clear();
    drawTitle('ALL ALLOCATIONS');

    try {
      const filter = await context.prompt.ask(
        '[F] Filter by resource profile/project ID or Enter for all: ',
      );
      let resourceProfileId: number | undefined;
      let projectId: number | undefined;

      if (filter.toUpperCase() === 'F') {
        const resourceRaw = await context.prompt.ask('Resource profile ID (blank for any): ');
        const projectRaw = await context.prompt.ask('Project ID (blank for any): ');
        resourceProfileId = resourceRaw ? Number(resourceRaw) : undefined;
        projectId = projectRaw ? Number(projectRaw) : undefined;
      }

      const result = await context.admin.listAllocations({ resourceProfileId, projectId });
      printTable(
        ['Employee', 'Project', '%', 'From', 'To'],
        result.allocations.map((allocation) => [
          allocation.employeeName,
          allocation.projectName,
          `${allocation.utilizationPercent}%`,
          formatApiDateForDisplay(allocation.fromDate),
          formatApiDateForDisplay(allocation.toDate),
        ]),
      );
      console.log(`\nTotal Active Allocations: ${result.summary.totalActive}`);
    } catch (error) {
      printApiError(error);
    }

    await context.prompt.pause();
    return { type: 'back' };
  },
};
