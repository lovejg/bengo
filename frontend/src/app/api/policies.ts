import { apiRequest } from './client';
import type { ListResponse } from '../types/api';
import type {
  EligibilityRequest,
  EligibilityResponse,
  GetPoliciesParams,
  PolicyDetail,
  PolicyListItem,
} from '../types/policy';

type PolicyListResponse = ListResponse<PolicyListItem>;

function getRequestedInterests(params: GetPoliciesParams) {
  const interests = params.interests?.length
    ? params.interests
    : params.interest
      ? [params.interest]
      : [];

  return Array.from(new Set(interests));
}

function getSingleInterestParams(params: GetPoliciesParams, interest?: GetPoliciesParams['interest']) {
  const { interests: _interests, interest: _interest, ...baseParams } = params;
  return interest ? { ...baseParams, interest } : baseParams;
}

function mergePolicyListResponses(responses: PolicyListResponse[]): PolicyListResponse {
  const items: PolicyListItem[] = [];
  const indexById = new Map<string, number>();

  for (const response of responses) {
    for (const item of response.items) {
      const existingIndex = indexById.get(item.id);
      if (existingIndex === undefined) {
        indexById.set(item.id, items.length);
        items.push(item);
        continue;
      }

      const existing = items[existingIndex];
      const existingScore = existing.fitScore ?? Number.NEGATIVE_INFINITY;
      const nextScore = item.fitScore ?? Number.NEGATIVE_INFINITY;
      if (nextScore > existingScore) {
        items[existingIndex] = item;
      }
    }
  }

  return {
    total: items.length,
    items,
  };
}

async function getPoliciesByPath(
  path: '/policies' | '/policies/recommended',
  params: GetPoliciesParams,
  auth: boolean,
) {
  const interests = getRequestedInterests(params);

  if (interests.length === 0) {
    return apiRequest<PolicyListResponse>(path, {
      method: 'GET',
      query: getSingleInterestParams(params),
      auth,
    });
  }

  if (interests.length === 1) {
    return apiRequest<PolicyListResponse>(path, {
      method: 'GET',
      query: getSingleInterestParams(params, interests[0]),
      auth,
    });
  }

  const responses = await Promise.all(
    interests.map((interest) =>
      apiRequest<PolicyListResponse>(path, {
        method: 'GET',
        query: getSingleInterestParams(params, interest),
        auth,
      }),
    ),
  );

  return mergePolicyListResponses(responses);
}

export function getPolicies(params: GetPoliciesParams = {}) {
  return getPoliciesByPath('/policies', params, false);
}

export function getPoliciesRecommended(params: GetPoliciesParams = {}) {
  return getPoliciesByPath('/policies/recommended', params, true);
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
