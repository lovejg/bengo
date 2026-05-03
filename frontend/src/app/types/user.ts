export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export type RegionCode =
  | 'seoul'
  | 'seoul_gangnam'
  | 'seoul_gangdong'
  | 'seoul_gangbuk'
  | 'seoul_gangseo'
  | 'seoul_gwanak'
  | 'seoul_gwangjin'
  | 'seoul_guro'
  | 'seoul_geumcheon'
  | 'seoul_nowon'
  | 'seoul_dobong'
  | 'seoul_dongdaemun'
  | 'seoul_dongjak'
  | 'seoul_mapo'
  | 'seoul_seodaemun'
  | 'seoul_seocho'
  | 'seoul_seongdong'
  | 'seoul_seongbuk'
  | 'seoul_songpa'
  | 'seoul_yangcheon'
  | 'seoul_yeongdeungpo'
  | 'seoul_yongsan'
  | 'seoul_eunpyeong'
  | 'seoul_jongno'
  | 'seoul_jung'
  | 'seoul_jungnang';

export type InterestCategory = 'youth_policy' | 'childcare_policy';

export interface UserProfileSummary {
  userId: string;
  email: string;
  emailVerified: boolean;
  profileCompleted: boolean;
  displayName: string | null;
  age: number | null;
  gender: Gender | null;
  regionCode: RegionCode | null;
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

export interface CompleteProfileRequest {
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
