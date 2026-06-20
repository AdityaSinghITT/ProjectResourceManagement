import { LlmProvider } from '@prisma/client';

export interface LlmRuntimeConfig {
  provider: LlmProvider;
  apiKey: string | null;
  baseUrl: string | null;
  model: string | null;
}
