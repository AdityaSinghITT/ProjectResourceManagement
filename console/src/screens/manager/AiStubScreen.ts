import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';

export function AiStubScreen(featureName: string): Screen {
  return {
    name: `AiStubScreen_${featureName}`,

    async run(context) {
      console.clear();
      drawTitle(featureName.toUpperCase());
      console.log('\nAI integration is not available yet.');
      console.log('Configure LLM API key in Admin > System Configuration,');
      console.log('then enable Phase 8 AI endpoints on the server.\n');
      console.log('Structured health flags are available under My Projects without AI.\n');
      await context.prompt.pause();
      return { type: 'back' };
    },
  };
}
