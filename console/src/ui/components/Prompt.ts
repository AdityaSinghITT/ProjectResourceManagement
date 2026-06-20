import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

export class Prompt {
  private readonly reader = readline.createInterface({ input, output });

  async ask(question: string): Promise<string> {
    const answer = await this.reader.question(question);
    return answer.trim();
  }

  async askHidden(question: string): Promise<string> {
    return this.ask(question);
  }

  async pause(message = '\nPress Enter to continue...'): Promise<void> {
    await this.ask(message);
  }

  close(): void {
    this.reader.close();
  }
}
