import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { formatApiDateForDisplay } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';

export const EmployeeAllocationsScreen: Screen = {
  name: 'EmployeeAllocationsScreen',

  async run(context) {
    console.clear();
    drawTitle('MY ALLOCATIONS');

    try {
      const result = await context.employee.getAllocations();
      const totalUtilization = result.allocations.reduce(
        (sum, allocation) => sum + allocation.utilizationPercent,
        0,
      );

      if (result.allocations.length === 0) {
        console.log('\nNo active allocations for the current week.');
      } else {
        printTable(
          ['Project', '%', 'From', 'To'],
          result.allocations.map((allocation) => [
            allocation.projectName,
            `${allocation.utilizationPercent}%`,
            formatApiDateForDisplay(allocation.fromDate),
            formatApiDateForDisplay(allocation.toDate),
          ]),
        );
        console.log(`\nTotal Utilisation (display only): ${totalUtilization}%`);
        console.log('Server enforces allocation rules on timesheet submit.\n');
      }
    } catch (error) {
      printApiError(error);
    }

    await context.prompt.pause();
    return { type: 'back' };
  },
};
