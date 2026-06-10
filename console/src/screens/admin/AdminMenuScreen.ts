import { Screen } from '../../navigation/Screen';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { formatNowForHeader } from '../../ui/formatters/dateFormatter';
import { createLogoutResult } from '../common/LoginScreen';
import { ManageEmployeesScreen } from './ManageEmployeesScreen';
import { ManageProjectsScreen } from './ManageProjectsScreen';
import { ManageUsersScreen } from './ManageUsersScreen';
import { SystemConfigScreen } from './SystemConfigScreen';
import { ViewAllocationsScreen } from './ViewAllocationsScreen';

export const AdminMenuScreen: Screen = {
  name: 'AdminMenuScreen',

  async run(context) {
    console.clear();
    const user = context.session.getUser();
    drawTitle(`ADMIN PANEL — Welcome, ${user?.fullName ?? 'Admin'}  |  ${formatNowForHeader()}`);
    drawDivider();
    console.log('1. Manage Employees');
    console.log('2. Manage Projects');
    console.log('3. View All Allocations');
    console.log('4. Manage Users');
    console.log('5. System Configuration');
    console.log('6. Logout\n');

    const choice = await context.prompt.ask('Enter option: ');

    switch (choice) {
      case '1':
        return { type: 'push', screen: ManageEmployeesScreen };
      case '2':
        return { type: 'push', screen: ManageProjectsScreen };
      case '3':
        return { type: 'push', screen: ViewAllocationsScreen };
      case '4':
        return { type: 'push', screen: ManageUsersScreen };
      case '5':
        return { type: 'push', screen: SystemConfigScreen };
      case '6':
        try {
          await context.auth.logout();
        } catch {
          // ignore
        }
        return createLogoutResult();
      default:
        console.log('\nInvalid option.');
        await context.prompt.pause();
        return { type: 'stay' };
    }
  },
};
