import { Application } from './app/Application';
import { createAppContext } from './app/createAppContext';

async function main(): Promise<void> {
  const context = createAppContext();
  const app = new Application(context);
  await app.run();
}

main().catch((error: unknown) => {
  console.error('Console failed to start:', error);
  process.exit(1);
});
