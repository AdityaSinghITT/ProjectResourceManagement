import { LlmProvider } from '@prisma/client';
import { SystemConfigView } from '../types/admin.types';

export interface UpdateSystemConfigInput {
  llmProvider?: LlmProvider;
  llmApiKey?: string | null;
  schedulerIntervalHours?: number;
  maxWeeklyHours?: number;
}

export interface ISystemConfigRepository {
  get(): Promise<SystemConfigView | null>;
  update(input: UpdateSystemConfigInput): Promise<SystemConfigView>;
}
