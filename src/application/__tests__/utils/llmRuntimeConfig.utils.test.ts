import { LlmProvider } from '@prisma/client';
import { LlmRuntimeConfig } from '../../../domain/types/llm.types';

const mockEnv = {
  llmBaseUrl: null as string | null,
  llmApiKey: null as string | null,
  llmModel: null as string | null,
  llmProvider: LlmProvider.OLLAMA,
};

jest.mock('../../../config/env', () => ({
  get env() {
    return mockEnv;
  },
}));

import { resolveLlmRuntimeConfig } from '../../utils/llmRuntimeConfig.utils';

describe('resolveLlmRuntimeConfig', () => {
  beforeEach(() => {
    mockEnv.llmBaseUrl = null;
    mockEnv.llmApiKey = null;
    mockEnv.llmModel = null;
    mockEnv.llmProvider = LlmProvider.OLLAMA;
  });

  it('returns null when neither database nor env provides LLM settings', () => {
    expect(resolveLlmRuntimeConfig(null)).toBeNull();
  });

  it('uses database values when configured', () => {
    expect(
      resolveLlmRuntimeConfig({
        provider: LlmProvider.OLLAMA,
        baseUrl: 'http://from-db',
        apiKey: 'db-key',
        model: 'db-model',
      }),
    ).toEqual({
      provider: LlmProvider.OLLAMA,
      baseUrl: 'http://from-db',
      apiKey: 'db-key',
      model: 'db-model',
    });
  });

  it('prefers database values over env when both are set', () => {
    mockEnv.llmBaseUrl = 'http://from-env';
    mockEnv.llmApiKey = 'env-key';
    mockEnv.llmModel = 'env-model';

    const dbConfig: LlmRuntimeConfig = {
      provider: LlmProvider.OLLAMA,
      baseUrl: 'http://from-db',
      apiKey: 'db-key',
      model: 'db-model',
    };

    expect(resolveLlmRuntimeConfig(dbConfig)).toEqual({
      provider: LlmProvider.OLLAMA,
      baseUrl: 'http://from-db',
      apiKey: 'db-key',
      model: 'db-model',
    });
  });

  it('falls back to env when database fields are missing', () => {
    mockEnv.llmBaseUrl = 'http://llm.internal:11434';
    mockEnv.llmApiKey = 'secret-key';
    mockEnv.llmModel = 'test-model';

    expect(resolveLlmRuntimeConfig(null)).toEqual({
      provider: LlmProvider.OLLAMA,
      baseUrl: 'http://llm.internal:11434',
      apiKey: 'secret-key',
      model: 'test-model',
    });
  });

  it('fills missing database fields from env', () => {
    mockEnv.llmApiKey = 'env-only-key';

    expect(
      resolveLlmRuntimeConfig({
        provider: LlmProvider.OLLAMA,
        baseUrl: 'http://from-db',
        model: 'db-model',
        apiKey: null,
      }),
    ).toEqual({
      provider: LlmProvider.OLLAMA,
      baseUrl: 'http://from-db',
      model: 'db-model',
      apiKey: 'env-only-key',
    });
  });
});
