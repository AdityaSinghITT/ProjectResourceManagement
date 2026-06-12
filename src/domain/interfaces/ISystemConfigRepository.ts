import { LlmProvider } from '@prisma/client';
import { SystemConfigView } from '../types/admin.types';
import { LlmRuntimeConfig } from '../types/llm.types';

export interface UpdateSystemConfigInput {
  llmProvider?: LlmProvider;
  llmApiKey?: string | null;
  llmBaseUrl?: string | null;
  llmModel?: string | null;
  schedulerIntervalHours?: number;
  maxWeeklyHours?: number;
}

export interface ISystemConfigRepository {
  get(): Promise<SystemConfigView | null>;
  getLlmRuntimeConfig(): Promise<LlmRuntimeConfig | null>;
  update(input: UpdateSystemConfigInput): Promise<SystemConfigView>;
}
