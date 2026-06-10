import { prisma } from '../client';
import {
  ISystemConfigRepository,
  UpdateSystemConfigInput,
} from '../../../domain/interfaces/ISystemConfigRepository';
import { SystemConfigView } from '../../../domain/types/admin.types';
import { MaskedValues } from '../../../shared/constants/adminMessages';

const SYSTEM_CONFIG_ID = 1;

function mapConfig(config: {
  llmProvider: SystemConfigView['llmProvider'];
  llmApiKey: string | null;
  schedulerIntervalHours: number;
  maxWeeklyHours: number;
}): SystemConfigView {
  return {
    llmProvider: config.llmProvider,
    llmApiKeyMasked: config.llmApiKey ? MaskedValues.API_KEY : '',
    schedulerIntervalHours: config.schedulerIntervalHours,
    maxWeeklyHours: config.maxWeeklyHours,
  };
}

export class PrismaSystemConfigRepository implements ISystemConfigRepository {
  async get(): Promise<SystemConfigView | null> {
    const config = await prisma.systemConfig.findUnique({
      where: { id: SYSTEM_CONFIG_ID },
    });

    return config ? mapConfig(config) : null;
  }

  async update(input: UpdateSystemConfigInput): Promise<SystemConfigView> {
    const config = await prisma.systemConfig.update({
      where: { id: SYSTEM_CONFIG_ID },
      data: {
        ...(input.llmProvider !== undefined ? { llmProvider: input.llmProvider } : {}),
        ...(input.llmApiKey !== undefined ? { llmApiKey: input.llmApiKey } : {}),
        ...(input.schedulerIntervalHours !== undefined
          ? { schedulerIntervalHours: input.schedulerIntervalHours }
          : {}),
        ...(input.maxWeeklyHours !== undefined ? { maxWeeklyHours: input.maxWeeklyHours } : {}),
      },
    });

    return mapConfig(config);
  }
}
