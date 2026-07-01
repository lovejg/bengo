import { apiRequest } from './client';
import type { ListResponse } from '../types/api';
import type { MyPolicyItem, UpdatedMyPolicyState, UpdateMyPolicyStateRequest, UserPolicyState } from '../types/policy';

export function getMyPolicies(state?: UserPolicyState) {
  return apiRequest<ListResponse<MyPolicyItem>>('/me/policies', {
    method: 'GET',
    query: { state },
    auth: true,
  });
}

export function updateMyPolicyState(id: string, payload: UpdateMyPolicyStateRequest) {
  return apiRequest<UpdatedMyPolicyState>(`/me/policies/${id}/state`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  });
}

export function removeMyPolicy(id: string): Promise<void> {
  return apiRequest<void>(`/me/policies/${id}`, {
    method: 'DELETE',
    auth: true,
  });
}
