import { apiRequest, setAccessToken, setStoredUserProfile } from './client';
import type { AuthResponse, CompleteProfileRequest, LoginRequest, SignupRequest } from '../types/user';

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

export async function completeProfile(payload: CompleteProfileRequest) {
  const response = await apiRequest<AuthResponse>('/auth/complete-profile', {
    method: 'POST',
    body: payload,
    auth: true,
  });

  setAccessToken(response.accessToken);
  setStoredUserProfile(response.user);
  return response;
}

export async function resendVerification(email: string) {
  return apiRequest<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: { email },
  });
}
