import type { InterestCategory, RegionCode } from './user';

export type PolicySortBy = 'relevance' | 'deadline' | 'latest';
export type SortOrder = 'asc' | 'desc';
export type UserPolicyState = 'saved' | 'applied';
export type EligibilityResult = 'eligible' | 'conditional' | 'ineligible';
export type EligibilityCompleteness = 'full' | 'partial' | 'minimal';
export type SourceType = 'official' | 'blog' | 'none';
export type PolicyType = 'application' | 'info';

export interface GetPoliciesParams {
  search?: string;
  interest?: InterestCategory;
  regionCode?: RegionCode;
  sortBy?: PolicySortBy;
  order?: SortOrder;
  onlyAvailable?: boolean;
}

export interface PolicyListItem {
  id: string;
  code: string;
  title: string;
  shortDescription: string;
  providerName: string;
  categories: InterestCategory[];
  regionCodes: RegionCode[];
  minAge: number | null;
  maxAge: number | null;
  startsAt: string | null;
  endsAt: string | null;
  isAlwaysOpen: boolean;
  periodRaw?: string | null;
  fitScore?: number | null;
  sourceType?: SourceType;
  userState?: UserPolicyState | null;
}

export interface PolicyRequirement {
  key: string;
  label?: string;
  type?: string;
  isRequired?: boolean;
  options?: string[];
  description?: string;
}

export interface PolicyEligibilityInfo {
  supportContent?: string | null;
  selectionCriteria?: string | null;
  applicationDeadline?: string | null;
}

export interface LastEligibilitySummary {
  result: EligibilityResult;
  reasons: string[];
  explanation: string;
  checkedAt: string;
}

export interface PolicyDetail {
  id: string;
  code?: string;
  title: string;
  shortDescription?: string;
  description?: string;
  providerName?: string;
  categories?: InterestCategory[];
  regionCodes?: RegionCode[];
  applicationUrl?: string | null;
  applicationMethod?: string | null;
  sourceUrl?: string | null;
  sourceType?: SourceType;
  policyType?: PolicyType;
  startsAt?: string | null;
  endsAt?: string | null;
  isAlwaysOpen?: boolean;
  periodRaw?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  requirements?: PolicyRequirement[];
  eligibilityInfo?: PolicyEligibilityInfo | null;
  eligibilityCompleteness?: EligibilityCompleteness | null;
  userState?: UserPolicyState | null;
  lastEligibility?: LastEligibilitySummary | null;
  [key: string]: unknown;
}

export interface EligibilityRequest {
  answers: Record<string, unknown>;
}

export interface EligibilityPolicySummary {
  title: string;
  applicationUrl?: string | null;
  applicationMethod?: string | null;
  sourceUrl?: string | null;
  sourceType?: SourceType;
}

export interface EligibilityResponse {
  result: EligibilityResult;
  reasons: string[];
  explanation: string;
  policy: EligibilityPolicySummary;
  eligibilityCompleteness?: EligibilityCompleteness | null;
  checkedAt: string;
}

export interface UpdateMyPolicyStateRequest {
  state: UserPolicyState;
  note?: string;
}

export interface MyPolicyItem {
  policyId: string;
  title: string;
  providerName: string;
  shortDescription?: string;
  categories?: InterestCategory[];
  sourceType?: SourceType;
  state: UserPolicyState;
  note: string | null;
  appliedAt: string | null;
  updatedAt: string;
}
