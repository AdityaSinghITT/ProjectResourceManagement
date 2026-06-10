import { NavigationStack } from '../navigation/NavigationStack';
import { AppContext } from './AppContext';
import { StartScreen } from '../screens/common/StartScreen';

export class Application {
  constructor(
    private readonly context: AppContext,
    private readonly navigation = new NavigationStack(),
  ) {}

  async run(): Promise<void> {
    try {
      await this.navigation.run(StartScreen, this.context);
    } finally {
      this.context.prompt.close();
    }
  }
}
