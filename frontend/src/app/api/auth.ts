import { apiRequest, setAccessToken, setAuthMethod, setStoredUserProfile } from './client';
import type {
  AuthResponse,
  ChangePasswordRequest,
  CompleteProfileRequest,
  DeleteAccountRequest,
  LoginRequest,
  SignupRequest,
  UpdateProfileRequest,
} from '../types/user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export async function signup(payload: SignupRequest) {
  const response = await apiRequest<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: payload,
  });

  if (response.user.emailVerified) {
    setAccessToken(response.accessToken);
    setAuthMethod('password');
    setStoredUserProfile(response.user);
  }

  return response;
}

export async function login(payload: LoginRequest) {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });

  if (response.user.emailVerified) {
    setAccessToken(response.accessToken);
    setAuthMethod('password');
    setStoredUserProfile(response.user);
  }

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

export async function updateProfile(payload: UpdateProfileRequest) {
  const response = await apiRequest<AuthResponse>('/auth/profile', {
    method: 'PATCH',
    body: payload,
    auth: true,
  });

  setAccessToken(response.accessToken);
  setStoredUserProfile(response.user);
  return response;
}

export async function changePassword(payload: ChangePasswordRequest) {
  return apiRequest<void>('/auth/change-password', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

export async function deleteAccount(payload: DeleteAccountRequest = {}) {
  return apiRequest<void>('/auth/delete-account', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

export async function resendVerification(email: string) {
  return apiRequest<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
    body: { email },
  });
}

export function getEmailVerificationUrl(token: string) {
  const url = new URL('/auth/verify-email', API_BASE_URL);
  url.searchParams.set('token', token);
  return url.toString();
}
