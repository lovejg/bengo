import { InterestCategory } from '../enums/interest-category.enum';
import { RegionCode } from '../enums/region-code.enum';

export const MVP_ALLOWED_REGIONS: RegionCode[] = [
  RegionCode.SEOUL,
];

export const MVP_ALLOWED_CATEGORIES: InterestCategory[] = [
  InterestCategory.YOUTH,
];

export const MVP_EXCLUDED_SOURCES = ['youthcenter-center'];

export const MVP_DEFAULT_BATCH_SOURCES = [
  'data-go-kr',
  'youthcenter-policy',
  'seoul-open-api',
] as const;
