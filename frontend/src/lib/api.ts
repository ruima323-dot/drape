import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Get the current session token from Supabase
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body, ...rest } = options;
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...rest,
      headers: {
        ...headers,
        ...rest.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ApiError(response.status, errorBody);
    }

    // 204 No Content — nothing to parse
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient(API_BASE_URL);
