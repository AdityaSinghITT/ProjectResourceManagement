import { LlmProvider } from '@prisma/client';
import { ISystemConfigRepository } from '../../domain/interfaces/ISystemConfigRepository';
import { SystemConfigView } from '../../domain/types/admin.types';
import { AppError } from '../../shared/errors/AppError';
import { AdminMessages, MaskedValues } from '../../shared/constants/adminMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';

export interface UpdateSystemConfigRequest {
  llmProvider?: LlmProvider;
  llmApiKey?: string | null;
  llmBaseUrl?: string | null;
  llmModel?: string | null;
  schedulerIntervalHours?: number;
  maxWeeklyHours?: number;
}

export class SystemConfigService {
  constructor(private readonly systemConfigRepository: ISystemConfigRepository) {}

  async getConfig(): Promise<SystemConfigView> {
    const config = await this.systemConfigRepository.get();

    if (!config) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        AdminMessages.SYSTEM_CONFIG_NOT_FOUND,
        ErrorTitles.NOT_FOUND,
      );
    }

    return config;
  }

  async updateConfig(
    input: UpdateSystemConfigRequest,
  ): Promise<{ message: string; config: SystemConfigView }> {
    this.validateNumericSettings(input);

    const normalized = this.normalizeLlmApiKeyUpdate(input);

    const config = await this.systemConfigRepository.update({
      llmProvider: normalized.llmProvider,
      llmApiKey: normalized.llmApiKey,
      llmBaseUrl: normalized.llmBaseUrl,
      llmModel: normalized.llmModel,
      schedulerIntervalHours: normalized.schedulerIntervalHours,
      maxWeeklyHours: normalized.maxWeeklyHours,
    });

    return { message: AdminMessages.SYSTEM_CONFIG_UPDATED, config };
  }

  private normalizeLlmApiKeyUpdate(
    input: UpdateSystemConfigRequest,
  ): UpdateSystemConfigRequest {
    if (input.llmApiKey === undefined) {
      return input;
    }

    const trimmed = input.llmApiKey?.trim() ?? '';
    if (trimmed === MaskedValues.API_KEY) {
      const { llmApiKey: _ignored, ...rest } = input;
      return rest;
    }

    return { ...input, llmApiKey: trimmed === '' ? null : trimmed };
  }

  private validateNumericSettings(input: UpdateSystemConfigRequest): void {
    if (input.schedulerIntervalHours !== undefined && input.schedulerIntervalHours <= 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        AdminMessages.SCHEDULER_INTERVAL_POSITIVE,
        ErrorTitles.BAD_REQUEST,
      );
    }

    if (input.maxWeeklyHours !== undefined && input.maxWeeklyHours <= 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        AdminMessages.MAX_WEEKLY_HOURS_POSITIVE,
        ErrorTitles.BAD_REQUEST,
      );
    }
  }
}
