import { LlmProvider } from '@prisma/client';
import { env } from '../../config/env';
import { LlmRuntimeConfig } from '../../domain/types/llm.types';
import { LlmConfig } from '../../shared/constants/llmConfig';

function coalesceString(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const primaryValue = primary?.trim();
  if (primaryValue) {
    return primaryValue;
  }

  const fallbackValue = fallback?.trim();
  return fallbackValue ? fallbackValue : null;
}

/** Admin DB values win; `.env` is only used when a DB field is unset (bootstrap / local dev). */
export function resolveLlmRuntimeConfig(dbConfig: LlmRuntimeConfig | null): LlmRuntimeConfig | null {
  const provider = dbConfig?.provider ?? env.llmProvider ?? LlmConfig.DEFAULT_PROVIDER;
  const baseUrl = coalesceString(dbConfig?.baseUrl, env.llmBaseUrl);
  const model = coalesceString(dbConfig?.model, env.llmModel);
  const apiKey = coalesceString(dbConfig?.apiKey, env.llmApiKey);

  if (!baseUrl && !model && !dbConfig) {
    return null;
  }

  return {
    provider: provider as LlmProvider,
    baseUrl,
    model,
    apiKey,
  };
}
