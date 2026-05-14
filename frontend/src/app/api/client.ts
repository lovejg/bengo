import type { ApiErrorResponse, RequestOptions } from '../types/api';
import type { UserProfileSummary } from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const ACCESS_TOKEN_KEY = 'bengo_access_token';
const USER_PROFILE_KEY = 'bengo_user_profile';
const AUTH_METHOD_KEY = 'bengo_auth_method';

export type AuthMethod = 'password' | 'oauth';

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

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== '') {
          url.searchParams.append(key, String(item));
        }
      });
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function getApiErrorMessage(data: unknown, fallback: string) {
  if (typeof data !== 'object' || data === null) {
    return fallback;
  }

  const error = data as ApiErrorResponse;

  if (typeof error.error === 'object' && error.error?.message) {
    return error.error.message;
  }

  if (typeof error.message === 'string') {
    return error.message;
  }

  if (Array.isArray(error.message)) {
    return error.message.join('\n');
  }

  if (typeof error.error === 'string') {
    return error.error;
  }

  return fallback;
}

function clearAuthSession() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(USER_PROFILE_KEY);
  window.localStorage.removeItem(AUTH_METHOD_KEY);
}

function isMissingAuthenticatedUser(status: number, message: string) {
  return (
    status === 404 &&
    (message.includes('사용자') || message.includes('프로필'))
  );
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
  window.localStorage.removeItem(AUTH_METHOD_KEY);
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

export function getAuthMethod(): AuthMethod | null {
  const method = window.localStorage.getItem(AUTH_METHOD_KEY);
  return method === 'password' || method === 'oauth' ? method : null;
}

export function setAuthMethod(method: AuthMethod) {
  window.localStorage.setItem(AUTH_METHOD_KEY, method);
}

export function clearAuthMethod() {
  window.localStorage.removeItem(AUTH_METHOD_KEY);
}

export function getEmailVerificationPath(email?: string | null) {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return `/check-email${query}`;
}

export function isEmailVerificationRequiredError(error: unknown) {
  return (
    error instanceof ApiClientError &&
    error.status === 403 &&
    (error.message.includes('이메일 인증') || error.message === 'Forbidden')
  );
}

export function buildOAuthUserProfile(token: string, profileCompleted: boolean): UserProfileSummary | null {
  try {
    const [, payload] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalized)) as { sub?: string; email?: string };

    if (!decoded.sub || !decoded.email) {
      return null;
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
      emailVerified: true,
      profileCompleted,
      displayName: null,
      age: null,
      gender: null,
      regionCode: null,
      interests: [],
    };
  } catch {
    return null;
  }
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
    const message = getApiErrorMessage(data, response.statusText ?? 'API request failed');

    if (response.status === 401) {
      clearAuthSession();
      window.location.href = '/login';
    }

    if (auth && isMissingAuthenticatedUser(response.status, message)) {
      clearAuthSession();
      window.location.href = '/login';
    }

    const errorBody =
      typeof data === 'object' && data !== null && typeof (data as ApiErrorResponse).error === 'object'
        ? (data as ApiErrorResponse).error
        : undefined;

    throw new ApiClientError(
      response.status,
      message,
      errorBody?.code,
      errorBody?.requestId,
    );
  }

  return data as T;
}
