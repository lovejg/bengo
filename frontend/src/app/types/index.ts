export interface Policy {
  id: string;
  title: string;
  summary: string;
  agency: string;
  region: string;
  period: string;
  status: 'recruiting' | 'always' | 'closed';
  eligibility?: 'eligible' | 'needsReview' | 'infoLacking';
  source: string;
  sourceUrl?: string;
  sourceType?: 'official' | 'blog' | 'none';
  details?: {
    target: string;
    criteria: string;
    benefits: string;
    applicationPeriod: string;
    applicationMethod: string;
  };
  evidence?: Array<{
    text: string;
    source: string;
  }>;
}

export interface User {
  name: string;
  email: string;
  age: number;
  gender?: 'male' | 'female' | 'unspecified';
  region: string;
  interests: string[];
}

export interface Filter {
  id: string;
  label: string;
  value?: string;
}

export * from './api';
export * from './policy';
export * from './user';
