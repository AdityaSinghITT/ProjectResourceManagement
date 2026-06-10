import { Screen } from '../../navigation/Screen';
import { drawDivider, drawTitle } from '../../ui/components/Box';
import { formatNowForHeader } from '../../ui/formatters/dateFormatter';
import { createLogoutResult } from '../common/LoginScreen';
import { AiAssistantScreen } from './AiAssistantScreen';
import { AllocateResourceScreen } from './AllocateResourceScreen';
import { ManagerProjectsScreen } from './ManagerProjectsScreen';
import { ManagerTimesheetsScreen } from './ManagerTimesheetsScreen';
import { ResourceDashboardScreen } from './ResourceDashboardScreen';

export const ManagerMenuScreen: Screen = {
  name: 'ManagerMenuScreen',

  async run(context) {
    console.clear();
    const user = context.session.getUser();
    drawTitle(`Welcome, ${user?.fullName ?? 'Manager'}!  |  ${formatNowForHeader()}`);
    drawDivider();
    console.log('1. Resource Dashboard');
    console.log('2. Allocate Resource');
    console.log('3. My Projects');
    console.log('4. Timesheets');
    console.log('5. AI Assistant');
    console.log('6. Logout\n');

    const choice = await context.prompt.ask('Enter option: ');

    switch (choice) {
      case '1':
        return { type: 'push', screen: ResourceDashboardScreen };
      case '2':
        return { type: 'push', screen: AllocateResourceScreen };
      case '3':
        return { type: 'push', screen: ManagerProjectsScreen };
      case '4':
        return { type: 'push', screen: ManagerTimesheetsScreen };
      case '5':
        return { type: 'push', screen: AiAssistantScreen };
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
