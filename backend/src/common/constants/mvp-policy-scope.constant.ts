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
  'youth-seoul',
] as const;

export interface MvpScopeResult {
  inScope: boolean;
  reason: string;
}

export function evaluateMvpScope(
  source: string,
  categories: InterestCategory[],
  regionCodes: RegionCode[],
): MvpScopeResult {
  if (MVP_EXCLUDED_SOURCES.includes(source)) {
    return { inScope: false, reason: `MVP 제외 소스(${source})` };
  }

  const hasAllowedCategory = categories.some((c) =>
    MVP_ALLOWED_CATEGORIES.includes(c),
  );
  if (!hasAllowedCategory) {
    return { inScope: false, reason: '청년정책 카테고리 불일치' };
  }

  const hasAllowedRegion = regionCodes.some((r) =>
    MVP_ALLOWED_REGIONS.includes(r),
  );
  if (!hasAllowedRegion) {
    return { inScope: false, reason: 'MVP 지역(서울) 불일치' };
  }

  return { inScope: true, reason: '' };
}

export function getPolicySource(
  extraMeta: unknown,
): string | null {
  const metadata = extraMeta as Record<string, unknown> | undefined;
  if (!metadata) return null;

  const pipeline = metadata.pipeline as Record<string, unknown> | undefined;
  if (pipeline && typeof pipeline.source === 'string' && pipeline.source.trim()) {
    return pipeline.source.trim();
  }

  if (typeof metadata.originalSource === 'string' && metadata.originalSource.trim()) {
    return metadata.originalSource.trim();
  }

  return null;
}
