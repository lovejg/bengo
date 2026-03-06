export interface Policy {
  id: string;
  title: string;
  summary: string;
  agency: string;
  region: string;
  period: string;
  status: 'recruiting' | 'always' | 'closed';
  eligibility?: 'eligible' | 'needsReview' | 'infoLacking';
  source: 'SSIS' | '온통청년' | '서울청년몽땅' | '크롤링';
  sourceUrl?: string;
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
  gender?: 'male' | 'female' | 'other';
  region: string;
  interests: string[];
}

export interface Filter {
  id: string;
  label: string;
  value?: string;
}
