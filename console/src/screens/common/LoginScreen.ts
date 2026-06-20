import { createRoleMenuScreen } from '../../app/RoleMenuFactory';
import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printApiError } from '../../ui/handleApiError';
import { ChangePasswordScreen } from './ChangePasswordScreen';
import { StartScreen } from './StartScreen';

export const LoginScreen: Screen = {
  name: 'LoginScreen',

  async run(context) {
    console.clear();
    drawTitle('LOGIN');

    const username = await context.prompt.ask('Username: ');
    const password = await context.prompt.ask('Password: ');

    if (!username || !password) {
      console.log('\nUsername and password are required.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    try {
      const result = await context.auth.login(username, password);
      context.session.setSession(result.token, result.user);

      if (result.user.forcePasswordChange) {
        return { type: 'replace', screen: ChangePasswordScreen };
      }

      console.log(`\nWelcome, ${result.user.fullName}!`);
      await context.prompt.pause();
      return { type: 'replace', screen: createRoleMenuScreen(result.user.role) };
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'back' };
    }
  },
};

export function createLogoutResult(): { type: 'logout'; screen: typeof StartScreen } {
  return { type: 'logout', screen: StartScreen };
}
