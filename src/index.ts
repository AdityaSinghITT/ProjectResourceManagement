/// <reference path="./types/express.d.ts" />
import { createApp } from './app';
import { env } from './config/env';
import { startScheduler } from './infrastructure/scheduler/startScheduler';
import { appLogger } from './shared/logger/appLogger';

const app = createApp();

app.listen(env.port, () => {
  console.log(`PRM API running on http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/api/health`);

  if (env.enableScheduler) {
    void startScheduler().catch((error) => {
      appLogger.error('Failed to start background scheduler', { error });
    });
  }
});