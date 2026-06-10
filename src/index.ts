/// <reference path="./types/express.d.ts" />
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, () => {
  console.log(`PRM API running on http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/api/health`);
});
