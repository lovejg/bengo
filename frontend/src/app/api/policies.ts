import { apiRequest } from './client';
import type { ListResponse } from '../types/api';
import type {
  EligibilityRequest,
  EligibilityResponse,
  GetPoliciesParams,
  PolicyDetail,
  PolicyListItem,
} from '../types/policy';

export function getPolicies(params: GetPoliciesParams = {}) {
  return apiRequest<ListResponse<PolicyListItem>>('/policies', {
    method: 'GET',
    query: params as Record<string, string | number | boolean | undefined | null>,
    auth: false,
  });
}

export function getPoliciesRecommended(params: GetPoliciesParams = {}) {
  return apiRequest<ListResponse<PolicyListItem>>('/policies/recommended', {
    method: 'GET',
    query: params as Record<string, string | number | boolean | undefined | null>,
    auth: true,
  });
}

export function getPolicyDetail(id: string) {
  return apiRequest<PolicyDetail>(`/policies/${id}`, {
    method: 'GET',
    auth: false,
  });
}

export function getPolicyDetailWithUser(id: string) {
  return apiRequest<PolicyDetail>(`/policies/${id}/my`, {
    method: 'GET',
    auth: true,
  });
}

export function checkEligibility(id: string, payload: EligibilityRequest) {
  return apiRequest<EligibilityResponse>(`/policies/${id}/check-eligibility`, {
    method: 'POST',
    body: payload,
    auth: true,
  });
}
