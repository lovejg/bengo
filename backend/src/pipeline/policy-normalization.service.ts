import { Injectable } from '@nestjs/common';
import { InterestCategory } from '../common/enums/interest-category.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
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
    const isAlwaysOpen = this.detectAlwaysOpen(text, meta);
    const periodRaw = this.extractPeriodRaw(meta);
    const regionCodes = this.extractRegionCodes(raw, text);
    const policyType = this.classifyPolicyType(raw.title, raw.body);

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
      isAlwaysOpen,
      periodRaw,
      policyType,
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

  private detectAlwaysOpen(
    text: string,
    meta: Record<string, unknown>,
  ): boolean {
    const candidates = [
      meta.applicationDeadline,
      meta.applicationPeriod,
      meta.operatingPeriod,
    ].filter((v): v is string => typeof v === 'string');

    const alwaysOpenPatterns = ['상시', '연중', '수시'];
    for (const value of candidates) {
      if (alwaysOpenPatterns.some((p) => value.includes(p))) {
        return true;
      }
    }

    // 본문에서도 상시 관련 키워드 탐지 (조합 없이 단독으로도 매칭)
    const combined = `${text} ${candidates.join(' ')}`;
    if (alwaysOpenPatterns.some((p) => combined.includes(p))) {
      return true;
    }

    // 조건부/개인일정 기반 → 날짜 없지만 신청 자체는 가능 → 상시로 간주
    const alwaysOpenConditionalPatterns = [
      /입주\s*\(?\s*예정\s*\)?\s*일/,       // 입주(예정)일 기준
      /전까지\s*(방문\s*)?신청/,             // ~전까지 방문신청
    ];
    for (const value of candidates) {
      if (alwaysOpenConditionalPatterns.some((p) => p.test(value))) {
        return true;
      }
    }

    // "매년 상반기", "12월중", "접수기관별 상이" 등은 상시가 아님
    // → isAlwaysOpen=false, periodRaw에 원문 보존하여 프론트에서 그대로 표시

    return false;
  }

  private extractPeriodRaw(meta: Record<string, unknown>): string | null {
    const candidates = [
      meta.applicationPeriod,
      meta.applicationDeadline,
      meta.operatingPeriod,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    const raw = candidates[0]?.trim() ?? null;
    // '-'는 의미 없는 값이므로 null 처리
    if (raw === '-') return null;
    return raw;
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
    // 메타데이터 후보 필드들을 순서대로 시도
    const metaCandidates = [
      meta.applicationPeriod,
      meta.applicationDeadline,
      meta.operatingPeriod,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    for (const candidate of metaCandidates) {
      const parsed = this.parseDateRange(candidate);
      if (parsed) return parsed;
    }

    // 본문 텍스트에서 시도
    const textParsed = this.parseDateRange(text);
    if (textParsed) return textParsed;

    return { startsAt: null, endsAt: null };
  }

  private parseDateRange(
    input: string,
  ): { startsAt: string; endsAt: string } | null {
    // YYYYMMDD ~ YYYYMMDD (온통청년 aplyYmd)
    const compactMatch = input.match(
      /(\d{4})(\d{2})(\d{2})\s*[~～\-]\s*(\d{4})(\d{2})(\d{2})/,
    );
    if (compactMatch) {
      return {
        startsAt: `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`,
        endsAt: `${compactMatch[4]}-${compactMatch[5]}-${compactMatch[6]}`,
      };
    }

    // 텍스트 정리: 요일, 시간, 부가 텍스트 제거
    const cleaned = input
      .replace(/\([월화수목금토일]\)/g, '')  // (금) 등 제거
      .replace(/\d{1,2}:\d{2}/g, '')          // 10:00 등 제거
      .replace(/년\s*/g, '.')                  // 년 → .
      .replace(/월\s*/g, '.')                  // 월 → .
      .replace(/일/g, '')                      // 일 제거
      .replace(/[※(].*$/g, '');               // ※이후, ()이후 부가설명 제거

    // "~" 또는 "～"로 분리
    const sepMatch = cleaned.match(/(.+?)\s*[~～]\s*(.+)/);
    if (!sepMatch) return null;

    const startPart = sepMatch[1].trim();
    const endPart = sepMatch[2].trim();

    const startDate = this.extractDateComponents(startPart);
    if (!startDate) return null;

    let endDate = this.extractDateComponents(endPart);
    if (!endDate) return null;

    // 종료일에 연도가 없으면 시작일 연도 사용 (예: "2023.5 ~ 12")
    if (!endDate.year && startDate.year) {
      endDate = { ...endDate, year: startDate.year };
    }

    if (!startDate.year || !endDate.year) return null;

    const startsAt = this.buildDateString(startDate.year, startDate.month, startDate.day, 'start');
    const endsAt = this.buildDateString(endDate.year, endDate.month, endDate.day, 'end');

    if (!startsAt || !endsAt) return null;
    return { startsAt, endsAt };
  }

  private extractDateComponents(
    text: string,
  ): { year: string | null; month: string | null; day: string | null } | null {
    const cleaned = text.replace(/[^0-9.\-/]/g, '').trim();
    if (!cleaned) return null;

    // 구분자로 분리 (.  -  /)
    const parts = cleaned
      .split(/[.\-/]/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return null;

    // 4자리 = 연도, 1~2자리 = 월 또는 일
    if (parts.length >= 3) {
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    if (parts.length === 2) {
      if (parts[0].length === 4) {
        return { year: parts[0], month: parts[1], day: null };
      }
      return { year: null, month: parts[0], day: parts[1] };
    }
    // 단일 숫자
    if (parts[0].length === 4) {
      return { year: parts[0], month: null, day: null };
    }
    return { year: null, month: parts[0], day: null };
  }

  private buildDateString(
    year: string,
    month: string | null,
    day: string | null,
    position: 'start' | 'end',
  ): string | null {
    const y = Number(year);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) return null;

    if (!month) return null;
    const m = Number(month);
    if (!Number.isFinite(m) || m < 1 || m > 12) return null;

    let d: number;
    if (day) {
      d = Number(day);
      if (!Number.isFinite(d) || d < 1 || d > 31) {
        d = position === 'start' ? 1 : new Date(y, m, 0).getDate();
      }
    } else {
      // 일자 없으면: 시작일은 1일, 종료일은 말일
      d = position === 'start' ? 1 : new Date(y, m, 0).getDate();
    }

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private classifyPolicyType(title: string, body: string): PolicyType {
    const text = `${title} ${body}`;

    // 안내형(INFO) 키워드: 센터 운영, 시설 운영, 홍보, 제작·배포 등
    const infoPatterns = [
      /센터\s*(설치\s*)?운영/,
      /시설\s*운영/,
      /카페\s*운영/,
      /홍보활동/,
      /제작\s*(및\s*)?배포/,
      /위원회\s*운영/,
      /네트워크\s*운영/,
      /기자단\s*운영/,
      /정보\s*제공/,
      /플랫폼\s*운영/,
    ];

    for (const pattern of infoPatterns) {
      if (pattern.test(title)) {
        return PolicyType.INFO;
      }
    }

    return PolicyType.APPLICATION;
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
