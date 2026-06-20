import { Screen } from '../../navigation/Screen';
import { drawSubtitle, drawTitle } from '../../ui/components/Box';
import { printApiError } from '../../ui/handleApiError';

export const ChangeMyPasswordScreen: Screen = {
  name: 'ChangeMyPasswordScreen',

  async run(context) {
    console.clear();
    drawTitle('CHANGE MY PASSWORD');
    drawSubtitle('Set a new password for your account.\n');

    const newPassword = await context.prompt.ask('New Password        : ');
    const confirmPassword = await context.prompt.ask('Confirm Password    : ');

    if (!newPassword || !confirmPassword) {
      console.log('\nBoth password fields are required.');
      await context.prompt.pause();
      return { type: 'back' };
    }

    try {
      const result = await context.auth.changePassword(newPassword, confirmPassword);
      context.session.setSession(result.token, result.user);
      console.log(`\n${result.message}`);
      await context.prompt.pause();
      return { type: 'back' };
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'stay' };
    }
  },
};
