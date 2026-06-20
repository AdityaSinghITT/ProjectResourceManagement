import { Screen } from '../../navigation/Screen';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { formatNowForHeader } from '../../ui/formatters/dateFormatter';
import { printApiError } from '../../ui/handleApiError';
import { createLogoutResult } from '../common/LoginScreen';
import { EmployeeAllocationsScreen } from './EmployeeAllocationsScreen';
import { SubmitTimesheetScreen } from './SubmitTimesheetScreen';
import { ViewTimesheetsScreen } from './ViewTimesheetsScreen';

export const EmployeeMenuScreen: Screen = {
  name: 'EmployeeMenuScreen',

  async run(context) {
    console.clear();
    const user = context.session.getUser();
    drawTitle(`Welcome, ${user?.fullName ?? 'Employee'}!  |  ${formatNowForHeader()}`);

    try {
      const reminder = await context.employee.getReminder();
      if (reminder.showReminder && reminder.message) {
        console.log(`\n  !  Reminder: ${reminder.message}\n`);
      }
    } catch (error) {
      printApiError(error);
    }

    drawDivider();
    console.log('1. Submit Timesheet');
    console.log('2. View My Timesheets');
    console.log('3. View My Allocations');
    console.log('4. Logout\n');

    const choice = await context.prompt.ask('Enter option: ');

    switch (choice) {
      case '1':
        return { type: 'push', screen: SubmitTimesheetScreen };
      case '2':
        return { type: 'push', screen: ViewTimesheetsScreen };
      case '3':
        return { type: 'push', screen: EmployeeAllocationsScreen };
      case '4':
        try {
          await context.auth.logout();
        } catch {
          // Server logout is best-effort; local session is always cleared.
        }
        return createLogoutResult();
      default:
        console.log('\nInvalid option.');
        await context.prompt.pause();
        return { type: 'stay' };
    }
  },
};
