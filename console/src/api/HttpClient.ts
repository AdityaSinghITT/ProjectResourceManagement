import { SessionStore } from '../session/SessionStore';
import { withRequestLoader } from '../ui/components/RequestLoader';
import { ApiError, ApiErrorBody } from './ApiError';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly session: SessionStore,
  ) {}

  async get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    return withRequestLoader(() => this.executeRequest<T>(method, path, body, query));
  }

  private async executeRequest<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    const token = this.session.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(
        503,
        'Service Unavailable',
        'Unable to reach the API. Ensure npm run dev is running and retry.',
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    let payload: unknown = null;

    if (text.length > 0) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        const preview = text.replace(/\s+/g, ' ').trim().slice(0, 120);
        throw new ApiError(
          response.status,
          'Bad Gateway',
          preview.length > 0
            ? `API returned non-JSON (HTTP ${response.status}): ${preview}`
            : `API returned a non-JSON response (HTTP ${response.status}).`,
        );
      }
    }

    if (!response.ok) {
      if (payload && typeof payload === 'object' && payload !== null && 'message' in payload) {
        throw ApiError.fromBody(payload as ApiErrorBody);
      }

      throw new ApiError(response.status, 'Error', `Request failed with status ${response.status}`);
    }

    return payload as T;
  }
}
