import { SessionStore } from '../session/SessionStore';
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

  private async request<T>(
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

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const payload = text.length > 0 ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      if (payload && typeof payload === 'object' && payload !== null && 'message' in payload) {
        throw ApiError.fromBody(payload as ApiErrorBody);
      }

      throw new ApiError(response.status, 'Error', `Request failed with status ${response.status}`);
    }

    return payload as T;
  }
}
