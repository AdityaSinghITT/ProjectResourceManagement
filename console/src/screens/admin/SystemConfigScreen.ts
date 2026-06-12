import { Screen } from '../../navigation/Screen';
import { drawTitle } from '../../ui/components/Box';
import { printApiError } from '../../ui/handleApiError';

export const SystemConfigScreen: Screen = {
  name: 'SystemConfigScreen',

  async run(context) {
    console.clear();
    drawTitle('SYSTEM CONFIGURATION');

    try {
      const { config } = await context.admin.getSystemConfig();
      console.log('\nCurrent Settings:');
      console.log(`  LLM Provider        :  ${config.llmProvider}`);
      console.log(`  LLM Base URL        :  ${config.llmBaseUrl || '(not set)'}`);
      console.log(`  LLM Model           :  ${config.llmModel || '(not set)'}`);
      console.log(`  LLM API Key         :  ${config.llmApiKeyMasked || '(not set)'}`);
      console.log(`  Scheduler Interval  :  ${config.schedulerIntervalHours} hours`);
      console.log(`  Max Weekly Hours    :  ${config.maxWeeklyHours}\n`);

      console.log('1. Update LLM API Key');
      console.log('2. Change LLM Provider (OLLAMA / GEMINI / GROQ)');
      console.log('3. Update LLM Base URL');
      console.log('4. Update LLM Model');
      console.log('5. Update Scheduler Interval');
      console.log('6. Update Max Weekly Hours');
      console.log('7. Back\n');

      const choice = await context.prompt.ask('Enter option: ');

      switch (choice) {
        case '1': {
          const llmApiKey = await context.prompt.ask('New API Key (blank to clear): ');
          await context.admin.updateSystemConfig({
            llmApiKey: llmApiKey.trim() === '' ? null : llmApiKey,
          });
          console.log('\nAPI key updated.');
          break;
        }
        case '2': {
          const provider = await context.prompt.ask('Provider (OLLAMA/GEMINI/GROQ): ');
          await context.admin.updateSystemConfig({ llmProvider: provider.toUpperCase() });
          console.log('\nProvider updated.');
          break;
        }
        case '3': {
          const llmBaseUrl = await context.prompt.ask('LLM base URL (e.g. http://host:11434, blank to clear): ');
          await context.admin.updateSystemConfig({
            llmBaseUrl: llmBaseUrl.trim() === '' ? null : llmBaseUrl.trim(),
          });
          console.log('\nBase URL updated.');
          break;
        }
        case '4': {
          const llmModel = await context.prompt.ask('LLM model name (blank to clear): ');
          await context.admin.updateSystemConfig({
            llmModel: llmModel.trim() === '' ? null : llmModel.trim(),
          });
          console.log('\nModel updated.');
          break;
        }
        case '5': {
          const hours = Number(await context.prompt.ask('Scheduler interval (hours): '));
          await context.admin.updateSystemConfig({ schedulerIntervalHours: hours });
          console.log('\nScheduler interval updated.');
          break;
        }
        case '6': {
          const maxWeeklyHours = Number(await context.prompt.ask('Max weekly hours: '));
          await context.admin.updateSystemConfig({ maxWeeklyHours });
          console.log('\nMax weekly hours updated.');
          break;
        }
        case '7':
          return { type: 'back' };
        default:
          console.log('\nInvalid option.');
          await context.prompt.pause();
          return { type: 'stay' };
      }

      await context.prompt.pause();
      return { type: 'stay' };
    } catch (error) {
      printApiError(error);
      await context.prompt.pause();
      return { type: 'stay' };
    }
  },
};
