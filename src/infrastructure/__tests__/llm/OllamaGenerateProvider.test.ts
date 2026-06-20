import { OllamaGenerateProvider } from '../../llm/OllamaGenerateProvider';

describe('OllamaGenerateProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('posts to /api/generate and returns trimmed response text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ response: '  hello world  ' }),
    });

    const provider = new OllamaGenerateProvider({
      baseUrl: 'http://localhost:11434/',
      model: 'gemma3:12b-it-q8_0',
    });

    const result = await provider.complete('test prompt');

    expect(result).toBe('hello world');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          model: 'gemma3:12b-it-q8_0',
          prompt: 'test prompt',
          stream: false,
        }),
      }),
    );
  });

  it('sends Authorization header when apiKey is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ response: 'ok' }),
    });

    const provider = new OllamaGenerateProvider({
      baseUrl: 'http://llm.internal',
      model: 'test-model',
      apiKey: 'secret-token',
    });

    await provider.complete('prompt');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          apiKey: 'secret-token',
        }),
      }),
    );
  });

  it('strips a trailing /api/generate path from the configured base URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ response: 'ok' }),
    });

    const provider = new OllamaGenerateProvider({
      baseUrl: 'http://llm.internal/api/generate',
      model: 'test-model',
    });

    await provider.complete('prompt');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://llm.internal/api/generate',
      expect.any(Object),
    );
  });

  it('throws when the host returns a non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: 'model not found' }),
    });

    const provider = new OllamaGenerateProvider({
      baseUrl: 'http://localhost:11434',
      model: 'missing-model',
    });

    await expect(provider.complete('prompt')).rejects.toThrow('model not found');
  });
});
