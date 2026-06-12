import { LlmProvider } from '@prisma/client';

/** Runtime tuning for LLM HTTP calls. Credentials live in Admin system config (DB); see SystemConfig. */
export const LlmConfig = {
  REQUEST_TIMEOUT_MS: 60_000,
  MAX_PROMPT_CHARS: 12_000,
  GENERATE_PATH: '/api/generate',
  DEFAULT_PROVIDER: LlmProvider.OLLAMA,
} as const;
