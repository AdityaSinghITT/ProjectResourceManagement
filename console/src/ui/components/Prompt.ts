import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

export class Prompt {
  private readonly reader = readline.createInterface({ input, output });

  async ask(question: string): Promise<string> {
    const answer = await this.reader.question(question);
    return answer.trim();
  }

  async askHidden(question: string): Promise<string> {
    const answer = await this.readHiddenLine(question);
    return answer.trim();
  }

  private readHiddenLine(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.reader.pause();

      const stdin = process.stdin;
      const stdout = process.stdout;
      const wasRaw = stdin.isRaw;

      stdout.write(question);

      stdin.setRawMode?.(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      let value = '';

      const finish = (result: string): void => {
        stdin.setRawMode?.(wasRaw ?? false);
        stdin.removeListener('data', onData);
        stdout.write('\n');
        this.reader.resume();
        resolve(result);
      };

      const onData = (chunk: string): void => {
        for (const char of chunk) {
          switch (char) {
            case '\r':
            case '\n':
              finish(value);
              return;
            case '\u0003':
              stdin.setRawMode?.(wasRaw ?? false);
              stdin.removeListener('data', onData);
              this.reader.resume();
              process.exit(0);
              break;
            case '\u007f':
            case '\b':
              if (value.length > 0) {
                value = value.slice(0, -1);
                stdout.write('\b \b');
              }
              break;
            default:
              if (char >= ' ' && char <= '~') {
                value += char;
                stdout.write('*');
              }
              break;
          }
        }
      };

      stdin.on('data', onData);
    });
  }

  async pause(message = '\nPress Enter to continue...'): Promise<void> {
    await this.ask(message);
  }

  close(): void {
    this.reader.close();
  }
}
