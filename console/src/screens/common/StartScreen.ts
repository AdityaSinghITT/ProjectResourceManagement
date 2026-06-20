import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { LoginScreen } from './LoginScreen';

export const StartScreen: Screen = {
  name: 'StartScreen',

  async run(context) {
    console.clear();
    drawTitle('PROJECT & RESOURCE MANAGEMENT TOOL');
    console.log('Learn & Code — Final Project\n');
    console.log('1. Login');
    console.log('2. Exit\n');

    const choice = await context.prompt.ask('Enter option: ');

    if (choice === '1') {
      return { type: 'push', screen: LoginScreen };
    }

    if (choice === '2') {
      return { type: 'exit' };
    }

    console.log('\nInvalid option.');
    await context.prompt.pause();
    return { type: 'stay' };
  },
};
