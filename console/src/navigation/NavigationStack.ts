import { AppContext } from '../app/AppContext';
import { Screen } from './Screen';

export class NavigationStack {
  private stack: Screen[] = [];

  async run(initialScreen: Screen, context: AppContext): Promise<void> {
    this.stack = [initialScreen];

    while (this.stack.length > 0) {
      const currentScreen = this.stack[this.stack.length - 1];
      const result = await currentScreen.run(context);

      switch (result.type) {
        case 'stay':
          break;
        case 'back':
          if (this.stack.length > 1) {
            this.stack.pop();
          }
          break;
        case 'push':
          this.stack.push(result.screen);
          break;
        case 'replace':
          this.stack[this.stack.length - 1] = result.screen;
          break;
        case 'logout':
          context.session.clear();
          this.stack = [result.screen];
          break;
        case 'exit':
          return;
        default:
          break;
      }
    }
  }
}
