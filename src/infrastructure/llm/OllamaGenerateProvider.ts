import { LlmConfig } from '../../shared/constants/llmConfig';
import { ILLMProvider } from './ILLMProvider';

export interface OllamaGenerateProviderOptions {
  baseUrl: string;
  model: string;
  apiKey?: string | null;
}

interface OllamaGenerateResponse {
  response?: string;
  error?: string;
}

export class OllamaGenerateProvider implements ILLMProvider {
  constructor(private readonly options: OllamaGenerateProviderOptions) {}

  async complete(prompt: string): Promise<string> {
    const url = `${normalizeBaseUrl(this.options.baseUrl)}${LlmConfig.GENERATE_PATH}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.options.apiKey) {
      headers.apiKey = this.options.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LlmConfig.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.options.model,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      const text = await response.text();
      let payload: OllamaGenerateResponse;

      try {
        payload = JSON.parse(text) as OllamaGenerateResponse;
      } catch {
        throw new Error(`Invalid JSON from LLM host: ${text.slice(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(payload.error ?? `LLM host returned status ${response.status}`);
      }

      if (!payload.response || payload.response.trim().length === 0) {
        throw new Error('LLM host returned an empty response');
      }

      return payload.response.trim();
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl
    .trim()
    .replace(/\/api\/generate\/?$/i, '')
    .replace(/\/+$/, '');
}
