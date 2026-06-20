import { Screen } from '../../navigation/Screen';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { printApiError } from '../../ui/handleApiError';

export const ResourceDashboardScreen: Screen = {
  name: 'ResourceDashboardScreen',

  async run(context) {
    console.clear();
    drawTitle('RESOURCE DASHBOARD');

    try {
      const dashboard = await context.manager.getDashboard();
      console.log(`\n${dashboard.monthLabel}\n`);
      console.log(`ON BENCH (${dashboard.bench.length} employees available)`);
      drawDivider();

      if (dashboard.bench.length === 0) {
        console.log('No employees on bench in your team.\n');
      } else {
        printTable(
          ['ID', 'Name', 'Department', 'Skills'],
          dashboard.bench.map((employee) => [
            String(employee.id),
            employee.fullName,
            employee.department,
            employee.skillsSummary,
          ]),
        );
      }

      console.log('\nACTIVE EMPLOYEES');
      drawDivider();
      printTable(
        ['ID', 'Name', 'Alloc %', 'Availability'],
        dashboard.active.map((employee) => [
          String(employee.id),
          employee.fullName,
          `${employee.utilizationPercent}%`,
          employee.status,
        ]),
      );

      console.log(
        `\nBench: ${dashboard.summary.benchCount}   |   Partial: ${dashboard.summary.partialCount}`,
      );

      const drill = await context.prompt.ask('\n[D] Drill into employee details     [B] Back\nChoice: ');
      if (drill.toUpperCase() === 'D') {
        const employeeIdRaw = await context.prompt.ask('Enter Employee ID (from dashboard): ');
        const employeeId = Number(employeeIdRaw);
        if (Number.isNaN(employeeId)) {
          console.log('\nInvalid employee ID.');
        } else {
          const detail = await context.manager.getEmployeeDetail(employeeId);
          drawDivider();
          console.log(`── ${detail.fullName} ──`);
          console.log(`Department     : ${detail.department}`);
          console.log(`Current Status : ${detail.currentStatus} (${detail.utilizationPercent}%)`);
          console.log(`Profile Skills : ${detail.profileSkills.join(', ') || '—'}`);
          console.log('\nActive Allocations:');
          printTable(
            ['Project', '%', 'From', 'To'],
            detail.activeAllocations.map((allocation) => [
              allocation.projectName,
              `${allocation.utilizationPercent}%`,
              allocation.fromDate,
              allocation.toDate,
            ]),
          );
          console.log('\nRecent Activity Tags (last 4 weeks):');
          console.log(detail.recentActivityTags.length > 0 ? detail.recentActivityTags.join(', ') : '—');
        }
        await context.prompt.pause();
        return { type: 'stay' };
      }
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
    }

    return { type: 'back' };
  },
};
