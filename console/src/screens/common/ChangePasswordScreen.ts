import { createRoleMenuScreen } from '../../app/RoleMenuFactory';
import { Screen } from '../../navigation/Screen';
import { drawSubtitle, drawTitle } from '../../ui/components/Box';
import { printApiError } from '../../ui/handleApiError';

export const ChangePasswordScreen: Screen = {
  name: 'ChangePasswordScreen',

  async run(context) {
    console.clear();
    drawTitle('CHANGE PASSWORD');
    drawSubtitle('You must set a new password to continue.\n');

    const newPassword = await context.prompt.ask('New Password        : ');
    const confirmPassword = await context.prompt.ask('Confirm Password    : ');

    if (!newPassword || !confirmPassword) {
      console.log('\nBoth password fields are required.');
      await context.prompt.pause();
      return { type: 'stay' };
    }

    try {
      const result = await context.auth.changePassword(newPassword, confirmPassword);
      context.session.setSession(result.token, result.user);
      console.log(`\n${result.message}`);
      console.log('Password updated. Welcome!');
      await context.prompt.pause();
      return { type: 'replace', screen: createRoleMenuScreen(result.user.role) };
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'stay' };
    }
  },
};
