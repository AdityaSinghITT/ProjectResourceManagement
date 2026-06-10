import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { AiStubScreen } from './AiStubScreen';

export const AiAssistantScreen: Screen = {
  name: 'AiAssistantScreen',

  async run(context) {
    console.clear();
    drawTitle('AI ASSISTANT');
    console.log('1. Skill Match    — Find best employees for a project requirement');
    console.log('2. Risk Summary   — Get a health analysis for a project');
    console.log('3. Back\n');

    const choice = await context.prompt.ask('Enter option: ');

    switch (choice) {
      case '1':
        return { type: 'push', screen: AiStubScreen('Skill Match') };
      case '2':
        return { type: 'push', screen: AiStubScreen('Risk Summary') };
      case '3':
        return { type: 'back' };
      default:
        console.log('\nInvalid option.');
        await context.prompt.pause();
        return { type: 'stay' };
    }
  },
};
