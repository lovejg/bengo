import type { ApiErrorResponse, RequestOptions } from '../types/api';
import type { UserProfileSummary } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const ACCESS_TOKEN_KEY = 'bengo_access_token';
const USER_PROFILE_KEY = 'bengo_user_profile';

export class ApiClientError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(status: number, message: string, code?: string, requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path, API_BASE_URL);

  if (!query) {
    return url.toString();
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getStoredUserProfile() {
  const raw = window.localStorage.getItem(USER_PROFILE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserProfileSummary;
  } catch {
    window.localStorage.removeItem(USER_PROFILE_KEY);
    return null;
  }
}

export function setStoredUserProfile(profile: UserProfileSummary) {
  window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function clearStoredUserProfile() {
  window.localStorage.removeItem(USER_PROFILE_KEY);
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, query, auth = false, signal } = options;
  const token = auth ? getAccessToken() : null;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401) {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
      window.localStorage.removeItem(USER_PROFILE_KEY);
      window.location.href = '/login';
    }
    const errorBody = typeof data === 'object' && data !== null ? (data as ApiErrorResponse).error : undefined;
    throw new ApiClientError(
      response.status,
      errorBody?.message ?? response.statusText ?? 'API request failed',
      errorBody?.code,
      errorBody?.requestId,
    );
  }

  return data as T;
}
