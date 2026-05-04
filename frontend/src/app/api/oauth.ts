const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export function continueWithOAuth(provider: 'google' | 'naver') {
  window.location.href = `${API_BASE_URL}/auth/${provider}`;
}
