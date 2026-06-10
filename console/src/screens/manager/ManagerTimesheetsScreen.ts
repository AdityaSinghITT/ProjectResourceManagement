import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { parseWeekStartInput, formatApiDateForDisplay } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';

export const ManagerTimesheetsScreen: Screen = {
  name: 'ManagerTimesheetsScreen',

  async run(context) {
    console.clear();
    drawTitle('TIMESHEETS — MY TEAM');

    const weekInput = await context.prompt.ask(
      'Filter by week (DD-MM-YYYY) or press Enter for current week Monday: ',
    );

    let weekStart: string | undefined;
    try {
      weekStart = weekInput.trim().length > 0 ? parseWeekStartInput(weekInput) : undefined;
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'back' };
    }

    try {
      const result = await context.manager.getTeamTimesheets(weekStart);
      console.log(`\nWeek: ${formatApiDateForDisplay(result.weekStart)} – ${formatApiDateForDisplay(result.weekEnd)}\n`);

      if (result.rows.length === 0) {
        console.log('No team rows for this week.');
      } else {
        printTable(
          ['Employee', 'Project', 'Hrs', 'Status'],
          result.rows.map((row) => [
            row.employeeName,
            row.projectName,
            row.hours === null ? '—' : String(row.hours),
            row.timesheetStatus ?? 'NOT SUBMITTED',
          ]),
        );
      }

      const choice = await context.prompt.ask('\n[V] View employee timesheet detail     [B] Back\nChoice: ');
      if (choice.toUpperCase() === 'V') {
        const employeeId = Number(await context.prompt.ask('Enter Employee ID: '));
        const detail = (await context.manager.getEmployeeTimesheet(
          employeeId,
          result.weekStart,
        )) as {
          weekStart: string;
          status: string;
          totalHours: number;
          entries: Array<{
            projectName: string;
            hours: number;
            tags: Array<{ activityTagName: string; customText: string | null }>;
          }>;
        };
        console.log(`\nWeek: ${formatApiDateForDisplay(detail.weekStart)} | Status: ${detail.status}`);
        printTable(
          ['Project', 'Hrs', 'Tags'],
          detail.entries.map((entry) => [
            entry.projectName,
            String(entry.hours),
            entry.tags
              .map((tag) => (tag.customText ? `${tag.activityTagName} (${tag.customText})` : tag.activityTagName))
              .join(', '),
          ]),
        );
        console.log(`Total: ${detail.totalHours} hrs`);
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
