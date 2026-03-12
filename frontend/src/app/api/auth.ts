import { apiRequest, setAccessToken, setStoredUserProfile } from './client';
import type { AuthResponse, LoginRequest, SignupRequest } from '../types/user';

export async function signup(payload: SignupRequest) {
  const response = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: payload,
  });

  setAccessToken(response.accessToken);
  setStoredUserProfile(response.user);
  return response;
}

export async function login(payload: LoginRequest) {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });

  setAccessToken(response.accessToken);
  setStoredUserProfile(response.user);
  return response;
}
