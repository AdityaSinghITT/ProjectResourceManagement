import { resolveLlmRuntimeConfig } from '../../../application/utils/llmRuntimeConfig.utils';
import {
  ISystemConfigRepository,
  UpdateSystemConfigInput,
} from '../../../domain/interfaces/ISystemConfigRepository';
import { SystemConfigView } from '../../../domain/types/admin.types';
import { LlmRuntimeConfig } from '../../../domain/types/llm.types';
import { MaskedValues } from '../../../shared/constants/adminMessages';
import { prisma } from '../client';

const SYSTEM_CONFIG_ID = 1;

function mapConfig(config: {
  llmProvider: SystemConfigView['llmProvider'];
  llmApiKey: string | null;
  llmBaseUrl: string | null;
  llmModel: string | null;
  schedulerIntervalHours: number;
  maxWeeklyHours: number;
}): SystemConfigView {
  return {
    llmProvider: config.llmProvider,
    llmApiKeyMasked: config.llmApiKey ? MaskedValues.API_KEY : '',
    llmBaseUrl: config.llmBaseUrl,
    llmModel: config.llmModel,
    schedulerIntervalHours: config.schedulerIntervalHours,
    maxWeeklyHours: config.maxWeeklyHours,
  };
}

function mapRuntimeConfig(config: {
  llmProvider: LlmRuntimeConfig['provider'];
  llmApiKey: string | null;
  llmBaseUrl: string | null;
  llmModel: string | null;
}): LlmRuntimeConfig {
  return {
    provider: config.llmProvider,
    apiKey: config.llmApiKey,
    baseUrl: config.llmBaseUrl,
    model: config.llmModel,
  };
}

export class PrismaSystemConfigRepository implements ISystemConfigRepository {
  async get(): Promise<SystemConfigView | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { id: SYSTEM_CONFIG_ID },
    });

    return config ? mapConfig(config) : null;
  }

  async getLlmRuntimeConfig(): Promise<LlmRuntimeConfig | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { id: SYSTEM_CONFIG_ID },
    });

    if (!config) {
      return resolveLlmRuntimeConfig(null);
    }

    return resolveLlmRuntimeConfig(mapRuntimeConfig(config));
  }

  async update(input: UpdateSystemConfigInput): Promise<SystemConfigView> {
    const config = await prisma.systemConfig.update({
      where: { id: SYSTEM_CONFIG_ID },
      data: {
        ...(input.llmProvider !== undefined ? { llmProvider: input.llmProvider } : {}),
        ...(input.llmApiKey !== undefined ? { llmApiKey: input.llmApiKey } : {}),
        ...(input.llmBaseUrl !== undefined ? { llmBaseUrl: input.llmBaseUrl } : {}),
        ...(input.llmModel !== undefined ? { llmModel: input.llmModel } : {}),
        ...(input.schedulerIntervalHours !== undefined
          ? { schedulerIntervalHours: input.schedulerIntervalHours }
          : {}),
        ...(input.maxWeeklyHours !== undefined ? { maxWeeklyHours: input.maxWeeklyHours } : {}),
      },
    });

    return mapConfig(config);
  }
}
