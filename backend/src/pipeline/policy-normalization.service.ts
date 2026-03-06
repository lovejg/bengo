import { Injectable } from '@nestjs/common';
import { InterestCategory } from '../common/enums/interest-category.enum';
import { RegionCode } from '../common/enums/region-code.enum';
import { NormalizedPolicyDocument } from './interfaces/normalized-policy.interface';
import { RawPolicyDocument } from './interfaces/raw-policy.interface';

interface NormalizationResult {
  normalized: NormalizedPolicyDocument;
  confidence: number;
  usedLlmFallback: boolean;
}

const YOUTH_KEYWORDS = [
  '청년',
  '대학생',
  '취업카페',
  '일경험',
  '뉴딜 일자리',
  '청년도약',
  '청년희망',
  '청년내일',
  '청년월세',
  '청년주택',
];

const CHILDCARE_KEYWORDS = ['육아', '돌봄', '자녀', '보육', '아이', '출산', '양육'];

const MVP_ALLOWED_REGION_CODES = new Set<string>([
  RegionCode.SEOUL,
]);

@Injectable()
export class PolicyNormalizationService {
  normalize(raw: RawPolicyDocument): NormalizationResult {
    const ruleBased = this.ruleBasedNormalize(raw);

    // MVP 단계에서는 규칙 기반 정규화를 우선 적용한다.
    // 추후 LLM 연동 시에는 스키마 제약(JSON Schema) 출력으로 확장한다.
    return {
      normalized: ruleBased,
      confidence: 0.75,
      usedLlmFallback: false,
    };
  }

  private ruleBasedNormalize(raw: RawPolicyDocument): NormalizedPolicyDocument {
    const text = `${raw.title} ${raw.body}`;
    const meta = (raw.metadata ?? {}) as Record<string, unknown>;

    const { minAge, maxAge } = this.extractAgeRange(text, meta);
    const { startsAt, endsAt } = this.extractDateRange(text, meta);
    const regionCodes = this.extractRegionCodes(raw, text);

    const categories: InterestCategory[] = [];
    if (YOUTH_KEYWORDS.some((kw) => text.includes(kw))) {
      categories.push(InterestCategory.YOUTH);
    }
    if (CHILDCARE_KEYWORDS.some((kw) => text.includes(kw))) {
      categories.push(InterestCategory.CHILDCARE);
    }

    const codeBase = `${raw.source}-${raw.title}`
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    return {
      code: codeBase.slice(0, 64),
      title: raw.title,
      shortDescription: raw.body.slice(0, 120),
      description: raw.body,
      providerName: String(meta.providerName ?? raw.source),
      sourceUrl: raw.sourceUrl ?? null,
      applicationUrl:
        (meta.applicationUrl as string | undefined)
        ?? raw.sourceUrl
        ?? null,
      applicationMethod: (meta.applicationMethod as string | undefined) ?? null,
      categories,
      regionCodes,
      minAge,
      maxAge,
      startsAt,
      endsAt,
      extraMeta: {
        originalSource: raw.source,
        fetchedAt: raw.fetchedAt,
        supportContent: (meta.supportContent as string | undefined) ?? null,
        selectionCriteria: (meta.selectionCriteria as string | undefined) ?? null,
        employmentStatus: (meta.employmentStatus as string | undefined) ?? null,
        educationReq: (meta.educationReq as string | undefined) ?? null,
        targetInfo:
          (meta.targetInfo as string | undefined)
          ?? (meta.targetAgeInfo as string | undefined)
          ?? (meta.ageInfo as string | undefined)
          ?? null,
        supportType: (meta.supportType as string | undefined) ?? null,
        applicationDeadline: (meta.applicationDeadline as string | undefined) ?? null,
        specializedReq: (meta.specializedReq as string | undefined) ?? null,
        metadata: meta,
      },
    };
  }

  private extractAgeRange(
    text: string,
    meta: Record<string, unknown>,
  ): { minAge: number | null; maxAge: number | null } {
    // 우선순위 1: 수집기가 구조화된 minAge/maxAge를 제공한 경우 (온통청년)
    if (meta.minAge != null || meta.maxAge != null) {
      const min = Number(meta.minAge);
      const max = Number(meta.maxAge);
      if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > 0) {
        return { minAge: min, maxAge: max };
      }
      if (Number.isFinite(min) && min > 0) {
        return { minAge: min, maxAge: null };
      }
      if (Number.isFinite(max) && max > 0) {
        return { minAge: null, maxAge: max };
      }
    }

    // 우선순위 2: ageInfo/targetAgeInfo 텍스트에서 추출
    const ageText = String(meta.ageInfo ?? meta.targetAgeInfo ?? '');
    const fromAgeText = this.parseAgeFromText(ageText);
    if (fromAgeText.minAge !== null || fromAgeText.maxAge !== null) {
      return fromAgeText;
    }

    // 우선순위 3: 본문 텍스트에서 정규식 추출
    return this.parseAgeFromText(text);
  }

  private parseAgeFromText(text: string): { minAge: number | null; maxAge: number | null } {
    // 범위 패턴 (양쪽 경계)
    const rangePatterns = [
      /만?\s*(\d{1,2})\s*세\s*[~～\-]\s*만?\s*(\d{1,2})\s*세/,
      /(\d{1,2})\s*[~～\-]\s*(\d{1,2})\s*세/,
      /연령\s*:?\s*만?\s*(\d{1,2})\s*세?\s*[~～\-이상부터]\s*만?\s*(\d{1,2})\s*세/,
      /만?\s*(\d{1,2})\s*세\s*이상\s*만?\s*(\d{1,2})\s*세\s*이하/,
    ];

    for (const pattern of rangePatterns) {
      const match = text.match(pattern);
      if (match) {
        const a = Number(match[1]);
        const b = Number(match[2]);
        if (a > 0 && a < 100 && b > 0 && b < 100) {
          return { minAge: Math.min(a, b), maxAge: Math.max(a, b) };
        }
      }
    }

    // 단일 경계 패턴
    const minOnly = text.match(/만?\s*(\d{1,2})\s*세\s*이상/);
    const maxOnly = text.match(/만?\s*(\d{1,2})\s*세\s*이하/);

    return {
      minAge: minOnly ? Number(minOnly[1]) : null,
      maxAge: maxOnly ? Number(maxOnly[1]) : null,
    };
  }

  private extractDateRange(
    text: string,
    meta: Record<string, unknown>,
  ): { startsAt: string | null; endsAt: string | null } {
    // 우선순위 1: applicationPeriod (YYYYMMDD ~ YYYYMMDD 형식, 온통청년 aplyYmd)
    const periodStr = String(meta.applicationPeriod ?? '');
    const periodMatch = periodStr.match(
      /(\d{4})(\d{2})(\d{2})\s*[~～\-]\s*(\d{4})(\d{2})(\d{2})/,
    );
    if (periodMatch) {
      return {
        startsAt: `${periodMatch[1]}-${periodMatch[2]}-${periodMatch[3]}`,
        endsAt: `${periodMatch[4]}-${periodMatch[5]}-${periodMatch[6]}`,
      };
    }

    // 우선순위 2: 본문 텍스트 정규식
    const patterns = [
      /(20\d{2}-\d{2}-\d{2})\s*[~～\-]\s*(20\d{2}-\d{2}-\d{2})/,
      /(20\d{2}\.\d{1,2}\.\d{1,2})\s*[~～\-]\s*(20\d{2}\.\d{1,2}\.\d{1,2})/,
      /(20\d{2}년\s*\d{1,2}월\s*\d{1,2}일)\s*[~～\-]\s*(20\d{2}년\s*\d{1,2}월\s*\d{1,2}일)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          startsAt: this.normalizeDate(match[1]),
          endsAt: this.normalizeDate(match[2]),
        };
      }
    }

    return { startsAt: null, endsAt: null };
  }

  private normalizeDate(dateStr: string): string {
    const cleaned = dateStr
      .replace(/년\s*/g, '-')
      .replace(/월\s*/g, '-')
      .replace(/일/g, '')
      .replace(/\./g, '-')
      .trim();
    const parts = cleaned.split('-').map((p) => p.trim().padStart(2, '0'));
    return parts.join('-');
  }

  private extractRegionCodes(
    raw: RawPolicyDocument,
    text: string,
  ): RegionCode[] {
    // 수집기에서 regionCodes 배열을 넘긴 경우(비어 있어도 포함),
    // 해당 값을 정규화의 우선/확정 값으로 사용한다.
    if (Array.isArray(raw.metadata?.regionCodes)) {
      return this.extractRegionCodesFromMetadata(raw.metadata?.regionCodes);
    }

    const combined = `${text} ${raw.metadata?.providerName ?? ''} ${raw.sourceUrl ?? ''}`;
    if (
      combined.includes('서울특별시') ||
      combined.includes('서울시') ||
      combined.includes('서울') ||
      combined.includes('11000')
    ) {
      return [RegionCode.SEOUL];
    }

    return [];
  }

  private extractRegionCodesFromMetadata(input: unknown): RegionCode[] {
    if (!Array.isArray(input)) {
      return [];
    }

    const unique = new Set<RegionCode>();
    for (const item of input) {
      if (typeof item !== 'string') {
        continue;
      }

      if (MVP_ALLOWED_REGION_CODES.has(item)) {
        unique.add(item as RegionCode);
      }
    }

    return Array.from(unique);
  }
}
