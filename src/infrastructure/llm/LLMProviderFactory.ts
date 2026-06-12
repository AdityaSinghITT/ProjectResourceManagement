import { LlmProvider } from '@prisma/client';
import { LlmRuntimeConfig } from '../../domain/types/llm.types';
import { AiMessages } from '../../shared/constants/aiMessages';
import { ErrorTitles, HttpStatus } from '../../shared/constants/httpStatusCodes';
import { AppError } from '../../shared/errors/AppError';
import { ILLMProvider } from './ILLMProvider';
import { OllamaGenerateProvider } from './OllamaGenerateProvider';

export class LLMProviderFactory {
  static fromConfig(config: LlmRuntimeConfig | null): ILLMProvider {
    if (!config) {
      throw llmNotConfiguredError();
    }

    if (!config.baseUrl || !config.model) {
      throw llmNotConfiguredError();
    }

    if (config.provider === LlmProvider.OLLAMA) {
      return new OllamaGenerateProvider({
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey: config.apiKey,
      });
    }

    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      `${AiMessages.NOT_CONFIGURED} Provider "${config.provider}" is not implemented yet. Use OLLAMA for private hosts.`,
      ErrorTitles.SERVICE_UNAVAILABLE,
    );
  }
}

function llmNotConfiguredError(): AppError {
  return new AppError(
    HttpStatus.SERVICE_UNAVAILABLE,
    AiMessages.NOT_CONFIGURED,
    ErrorTitles.SERVICE_UNAVAILABLE,
  );
}
