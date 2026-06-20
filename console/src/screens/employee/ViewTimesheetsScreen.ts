import { Screen } from '../../navigation/Screen';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { printTable } from '../../ui/components/Table';
import { formatApiDateForDisplay, parseWeekStartInput } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';

export const ViewTimesheetsScreen: Screen = {
  name: 'ViewTimesheetsScreen',

  async run(context) {
    console.clear();
    drawTitle('MY TIMESHEETS');

    try {
      const history = await context.employee.listTimesheets();

      if (history.timesheets.length === 0) {
        console.log('\nNo timesheets found.');
      } else {
        printTable(
          ['Week Start', 'Total Hrs', 'Status'],
          history.timesheets.map((item) => [
            formatApiDateForDisplay(item.weekStart),
            `${item.totalHours} hrs`,
            item.status === 'MISSED' ? 'MISSED !' : item.status,
          ]),
        );
        console.log(
          `\nSubmitted: ${history.summary.submitted}   |   Missed: ${history.summary.missed}`,
        );
        console.log('(MISSED rows appear only when marked in the system.)\n');
      }

      const choice = await context.prompt.ask('[V] View week details     [B] Back\nChoice: ');

      if (choice.toUpperCase() === 'V') {
        const weekInput = await context.prompt.ask('Enter week start (DD-MM-YYYY or YYYY-MM-DD): ');
        const apiWeek = parseWeekStartInput(weekInput);
        const detail = await context.employee.getWeekDetail(apiWeek);
        drawDivider();
        console.log(`Week: ${formatApiDateForDisplay(detail.weekStart)} — Status: ${detail.status}\n`);
        printTable(
          ['Project', 'Hrs', 'Activity Tags'],
          detail.entries.map((entry) => [
            entry.projectName,
            String(entry.hours),
            entry.tags
              .map((tag) =>
                tag.customText ? `${tag.activityTagName} (${tag.customText})` : tag.activityTagName,
              )
              .join(', '),
          ]),
        );
        console.log(`\nTotal: ${detail.totalHours} hrs`);
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
