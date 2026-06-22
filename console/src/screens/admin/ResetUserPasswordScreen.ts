import { AppContext } from '../../app/AppContext';
import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printApiError } from '../../ui/handleApiError';

export async function runResetUserPassword(context: AppContext): Promise<void> {
  const identifier = await context.prompt.ask('Enter Username or User ID: ');
  const newTemporaryPassword = await context.prompt.askHidden('New Temporary Password: ');

  if (!identifier || !newTemporaryPassword) {
    console.log('\nUsername or user ID and new password are required.');
    return;
  }

  const result = await context.admin.resetUserPasswordByIdentifier(identifier, newTemporaryPassword);
  console.log(`\n${result.message}`);
  console.log(`User ID: ${result.user.id}   Username: ${result.user.username}`);
}

export const ResetUserPasswordScreen: Screen = {
  name: 'ResetUserPasswordScreen',

  async run(context) {
    console.clear();
    drawTitle('RESET USER PASSWORD');

    try {
      await runResetUserPassword(context);
    } catch (error) {
      printApiError(error);
    }

    await context.prompt.pause();
    return { type: 'back' };
  },
};
