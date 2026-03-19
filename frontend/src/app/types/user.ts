export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export type RegionCode = 'seoul';

export type InterestCategory = 'youth_policy' | 'childcare_policy';

export interface UserProfileSummary {
  userId: string;
  email: string;
  age: number;
  gender: Gender;
  regionCode: RegionCode;
  interests: InterestCategory[];
}

export interface SignupRequest {
  email: string;
  password: string;
  age: number;
  gender: Gender;
  regionCode: RegionCode;
  interests: InterestCategory[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserProfileSummary;
}
