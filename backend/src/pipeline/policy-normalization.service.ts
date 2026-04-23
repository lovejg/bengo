import { Injectable } from '@nestjs/common';
import { InterestCategory } from '../common/enums/interest-category.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { RegionCode, SEOUL_GU_MAP } from '../common/enums/region-code.enum';
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

const MVP_ALLOWED_REGION_CODES = new Set<string>([RegionCode.SEOUL]);

/** "상시 아님"으로 판단되는 패턴들 — `수시/운영시간/평일(`은 의미가 다르므로 명시적으로 제외 */
const NOT_ALWAYS_OPEN_PATTERNS: readonly RegExp[] = [
  /접수기관\s*별?\s*상이/,
  /기관\s*별?\s*상이/,
  /공고문\s*참고/,
  /별도\s*공고/,
  /추후\s*공고/,
  /홈페이지\s*공고/,
  /공고\s*\(?\s*게시\s*\)?/,
  /모집\s*시\s*.{0,20}공고/,
  /수시/,
  /운영시간/,
  /평일\s*\(/,
];

const ALWAYS_OPEN_KEYWORD = '상시';
const ALWAYS_OPEN_TEXT_PATTERNS: readonly RegExp[] = [
  /연중\s*(모집|운영|접수|신청|상시)/,
  // "이후~ 계속", "2012년 ~ (계속)", "'19년~" 등 계속/무기한 패턴
  /(?:이후|20\d{2}년?\s*[~～\-]|'\d{2}년\s*[~～])\s*[~～]?\s*\(?\s*계속\s*\)?/,
];

const NONINFORMATIVE_PERIOD_PATTERN =
  /^(-|별도\s*공지|별도\s*공고|추후\s*공고|미정|해당없음|해당\s*없음|접수기관\s*별?\s*상이|기관\s*별?\s*상이)$/;

const PERIOD_LABEL_PATTERNS: readonly RegExp[] = [
  /사업\s*기간\s*[:：]?\s*([^\n]{3,40})/,
  /운영\s*기간\s*[:：]?\s*([^\n]{3,40})/,
  /모집\s*기간\s*[:：]?\s*([^\n]{3,40})/,
  /신청\s*기간\s*[:：]?\s*([^\n]{3,40})/,
  /접수\s*기간\s*[:：]?\s*([^\n]{3,40})/,
];

/** 나이 범위 패턴 (양쪽 경계) */
const AGE_RANGE_PATTERNS: readonly RegExp[] = [
  /만?\s*(\d{1,2})\s*세\s*[~～\-]\s*만?\s*(\d{1,2})\s*세/,
  /(\d{1,2})\s*[~～\-]\s*(\d{1,2})\s*세/,
  /연령\s*:?\s*만?\s*(\d{1,2})\s*세?\s*[~～\-이상부터]\s*만?\s*(\d{1,2})\s*세/,
  /만?\s*(\d{1,2})\s*세\s*이상\s*만?\s*(\d{1,2})\s*세\s*이하/,
];

const AGE_MIN_PATTERN = /만?\s*(\d{1,2})\s*세\s*이상/;
const AGE_MAX_PATTERN = /만?\s*(\d{1,2})\s*세\s*이하/;

const DATE_COMPACT_RANGE_PATTERN = /(\d{4})(\d{2})(\d{2})\s*[~～\-]\s*(\d{4})(\d{2})(\d{2})/;

/** INFO 타입 키워드 — 제목에서 감지 */
const INFO_TITLE_PATTERNS: readonly RegExp[] = [
  /청년(?!창업)[가-힣]{0,8}\s*센터\s*(설치\s*)?운영/,
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

/** 본문에서 "직권 지급" 등 개인 신청이 없는 정책은 INFO로 분류 */
const AUTO_GRANT_BODY_PATTERNS: readonly RegExp[] = [
  /개인\s*신청\s*절차\s*없음/,
  /직권\s*지급/,
  /자동\s*지급/,
  /별도\s*신청\s*(불필요|없음)/,
];

const RESIDENCY_CONTEXT_PATTERN = /(?:거주|주민등록|주소지|주거지)/;
const RESIDENCY_CONTEXT_WINDOW = 30;

@Injectable()
export class PolicyNormalizationService {
  normalize(raw: RawPolicyDocument): NormalizationResult {
    // MVP 단계는 규칙 기반 정규화 우선. 추후 LLM fallback은 JSON Schema로 확장 예정.
    return {
      normalized: this.ruleBasedNormalize(raw),
      confidence: 0.75,
      usedLlmFallback: false,
    };
  }

  private ruleBasedNormalize(raw: RawPolicyDocument): NormalizedPolicyDocument {
    const meta = (raw.metadata ?? {}) as Record<string, unknown>;
    // supportContent는 youthcenter-policy에서 상세 사업 내용(기간, 소득, 자산 등)이 담기는 필드
    const supportContent = typeof meta.supportContent === 'string' ? meta.supportContent : '';
    const extendedBody = supportContent ? `${raw.body}\n${supportContent}` : raw.body;
    const text = `${raw.title} ${extendedBody}`;

    const { minAge, maxAge } = this.extractAgeRange(text, meta);
    const { startsAt, endsAt } = this.extractDateRange(text, meta);
    const isAlwaysOpen = this.detectAlwaysOpen(text, meta);
    const periodRaw = this.extractPeriodRaw(meta, extendedBody);
    const regionCodes = this.extractRegionCodes(raw, text);
    const policyType = this.classifyPolicyType(raw.title, raw.body);

    const categories: InterestCategory[] = [];
    if (YOUTH_KEYWORDS.some((kw) => text.includes(kw))) categories.push(InterestCategory.YOUTH);
    if (CHILDCARE_KEYWORDS.some((kw) => text.includes(kw))) categories.push(InterestCategory.CHILDCARE);

    const code = `${raw.source}-${raw.title}`
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 64);

    return {
      code,
      title: raw.title,
      shortDescription: raw.body.slice(0, 120),
      description: raw.body,
      providerName: String(meta.providerName ?? raw.source),
      sourceUrl: raw.sourceUrl ?? null,
      applicationUrl: (meta.applicationUrl as string | undefined) ?? raw.sourceUrl ?? null,
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
        warnBox: (meta.warnBox as string | undefined) ?? null,
        metadata: meta,
      },
    };
  }

  private detectAlwaysOpen(text: string, meta: Record<string, unknown>): boolean {
    const candidates = [meta.applicationDeadline, meta.applicationPeriod, meta.operatingPeriod]
      .filter((v): v is string => typeof v === 'string');

    for (const value of candidates) {
      if (NOT_ALWAYS_OPEN_PATTERNS.some((p) => p.test(value))) {
        return false;
      }
    }

    const hasKeyword = (v: string) => v.includes(ALWAYS_OPEN_KEYWORD);
    if (candidates.some(hasKeyword)) return true;

    const combined = `${text} ${candidates.join(' ')}`;
    if (hasKeyword(combined)) return true;
    if (ALWAYS_OPEN_TEXT_PATTERNS.some((p) => p.test(combined))) return true;

    // "'19년~", "'21년~" 처럼 끝 날짜 없이 ~ 로 끝나는 경우
    const trimmed = combined.trim();
    if (/'\d{2}년\s*~\s*$/.test(trimmed) || /'\d{2}년\s*~\s*\n/.test(combined)) {
      return true;
    }

    return false;
  }

  private extractPeriodRaw(meta: Record<string, unknown>, body: string): string | null {
    const metaCandidates = [meta.applicationPeriod, meta.applicationDeadline, meta.operatingPeriod]
      .filter(
        (v): v is string =>
          typeof v === 'string' &&
          v.trim().length > 0 &&
          !NONINFORMATIVE_PERIOD_PATTERN.test(v.trim()),
      );

    if (metaCandidates.length > 0) return metaCandidates[0].trim();

    for (const pattern of PERIOD_LABEL_PATTERNS) {
      const match = body.match(pattern);
      if (!match) continue;
      const val = match[1].trim();
      if (val && !NONINFORMATIVE_PERIOD_PATTERN.test(val)) return val;
    }

    return null;
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
      if (Number.isFinite(min) && min > 0) return { minAge: min, maxAge: null };
      if (Number.isFinite(max) && max > 0) return { minAge: null, maxAge: max };
    }

    // 우선순위 2: ageInfo/targetAgeInfo 텍스트
    const ageText = String(meta.ageInfo ?? meta.targetAgeInfo ?? '');
    const fromAgeText = this.parseAgeFromText(ageText);
    if (fromAgeText.minAge !== null || fromAgeText.maxAge !== null) {
      return fromAgeText;
    }

    // 우선순위 3: 본문
    return this.parseAgeFromText(text);
  }

  private parseAgeFromText(text: string): { minAge: number | null; maxAge: number | null } {
    for (const pattern of AGE_RANGE_PATTERNS) {
      const match = text.match(pattern);
      if (!match) continue;
      const a = Number(match[1]);
      const b = Number(match[2]);
      if (a > 0 && a < 100 && b > 0 && b < 100) {
        return { minAge: Math.min(a, b), maxAge: Math.max(a, b) };
      }
    }

    const minOnly = text.match(AGE_MIN_PATTERN);
    const maxOnly = text.match(AGE_MAX_PATTERN);

    return {
      minAge: minOnly ? Number(minOnly[1]) : null,
      maxAge: maxOnly ? Number(maxOnly[1]) : null,
    };
  }

  private extractDateRange(
    text: string,
    meta: Record<string, unknown>,
  ): { startsAt: string | null; endsAt: string | null } {
    const metaCandidates = [meta.applicationPeriod, meta.applicationDeadline, meta.operatingPeriod]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

    for (const candidate of metaCandidates) {
      const parsed = this.parseDateRange(candidate);
      if (parsed) return parsed;
    }

    const textParsed = this.parseDateRange(text);
    if (textParsed) return textParsed;

    // 연도만 있는 경우 (예: "2025") → 해당 연도 전체로 해석
    for (const candidate of metaCandidates) {
      const yearOnly = candidate.trim().match(/^(20\d{2})$/);
      if (yearOnly) {
        return { startsAt: `${yearOnly[1]}-01-01`, endsAt: `${yearOnly[1]}-12-31` };
      }
    }

    return { startsAt: null, endsAt: null };
  }

  private parseDateRange(input: string): { startsAt: string; endsAt: string } | null {
    // YYYYMMDD ~ YYYYMMDD (온통청년 aplyYmd)
    const compactMatch = input.match(DATE_COMPACT_RANGE_PATTERN);
    if (compactMatch) {
      return {
        startsAt: `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`,
        endsAt: `${compactMatch[4]}-${compactMatch[5]}-${compactMatch[6]}`,
      };
    }

    const cleaned = input
      .replace(/\([월화수목금토일]\)/g, '')
      .replace(/\d{1,2}:\d{2}/g, '')
      .replace(/년\s*/g, '.')
      .replace(/월\s*/g, '.')
      .replace(/일/g, '')
      .replace(/[※(].*$/g, '');

    const sepMatch = cleaned.match(/(.+?)\s*[~～]\s*(.+)/);
    if (!sepMatch) return null;

    const startDate = this.extractDateComponents(sepMatch[1].trim());
    if (!startDate) return null;

    let endDate = this.extractDateComponents(sepMatch[2].trim());
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

    const parts = cleaned
      .split(/[.\-/]/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return null;

    if (parts.length >= 3) {
      return { year: parts[0], month: parts[1], day: parts[2] };
    }
    if (parts.length === 2) {
      if (parts[0].length === 4) {
        return { year: parts[0], month: parts[1], day: null };
      }
      return { year: null, month: parts[0], day: parts[1] };
    }
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

    // 시작일은 1일, 종료일은 말일 (일자 없을 때 fallback)
    const lastDay = new Date(y, m, 0).getDate();
    let d: number;
    if (day) {
      d = Number(day);
      if (!Number.isFinite(d) || d < 1 || d > 31) {
        d = position === 'start' ? 1 : lastDay;
      }
    } else {
      d = position === 'start' ? 1 : lastDay;
    }

    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  private classifyPolicyType(title: string, body: string): PolicyType {
    if (INFO_TITLE_PATTERNS.some((p) => p.test(title))) return PolicyType.INFO;
    if (AUTO_GRANT_BODY_PATTERNS.some((p) => p.test(body))) return PolicyType.INFO;
    return PolicyType.APPLICATION;
  }

  private extractRegionCodes(raw: RawPolicyDocument, text: string): RegionCode[] {
    // 수집기에서 regionCodes 배열을 넘긴 경우(비어 있어도 포함) 정규화의 확정 값으로 사용
    if (Array.isArray(raw.metadata?.regionCodes)) {
      const fromMeta = this.extractRegionCodesFromMetadata(raw.metadata?.regionCodes);
      // 메타가 SEOUL만 준 경우 본문에서 특정 구 감지 시도
      if (fromMeta.length === 1 && fromMeta[0] === RegionCode.SEOUL) {
        const guCode = this.detectGuFromText(raw.title, text, raw.metadata?.providerName as string | undefined);
        if (guCode) return [guCode];
      }
      return fromMeta;
    }

    const combined = `${text} ${raw.metadata?.providerName ?? ''} ${raw.sourceUrl ?? ''}`;
    const isSeoulPolicy =
      combined.includes('서울특별시') ||
      combined.includes('서울시') ||
      combined.includes('서울') ||
      combined.includes('11000');

    if (isSeoulPolicy) {
      const guCode = this.detectGuFromText(raw.title, text, raw.metadata?.providerName as string | undefined);
      return [guCode ?? RegionCode.SEOUL];
    }

    return [];
  }

  /**
   * 제목 우선, providerName, 본문 보조로 특정 구 이름 감지.
   * 여러 구가 동시에 언급되면 신뢰도가 낮으므로 null 반환 → 서울 전체로 처리.
   */
  private detectGuFromText(
    title: string,
    fullText: string,
    providerName?: string,
  ): RegionCode | null {
    const guNames = Object.keys(SEOUL_GU_MAP);

    // 1. 제목 직접 매칭
    const titleMatches = guNames.filter((gu) => title.includes(gu));
    if (titleMatches.length === 1) return SEOUL_GU_MAP[titleMatches[0]];

    // 제목 단축형: "(광진)", "(강남)" 등
    const shortNameMatch = title.match(/\(([가-힣]{2,4})\)\s*$/);
    if (shortNameMatch) {
      const shortName = shortNameMatch[1];
      const fullGuName = guNames.find((gu) => gu.startsWith(shortName));
      if (fullGuName) return SEOUL_GU_MAP[fullGuName];
    }

    // 2. providerName에서 감지 (본문보다 신뢰도 높음)
    if (providerName) {
      const providerMatches = guNames.filter((gu) => providerName.includes(gu));
      if (providerMatches.length === 1) return SEOUL_GU_MAP[providerMatches[0]];
    }

    // 3. 본문 감지 — 거주/주민등록 문맥 근처에서만 인정 (시설 주소 오탐 방지)
    const textMatches = guNames.filter((gu) => {
      const idx = fullText.indexOf(gu);
      if (idx === -1) return false;
      const context = fullText.slice(
        Math.max(0, idx - RESIDENCY_CONTEXT_WINDOW),
        idx + gu.length + RESIDENCY_CONTEXT_WINDOW,
      );
      return RESIDENCY_CONTEXT_PATTERN.test(context);
    });
    if (textMatches.length === 1) return SEOUL_GU_MAP[textMatches[0]];

    return null;
  }

  private extractRegionCodesFromMetadata(input: unknown): RegionCode[] {
    if (!Array.isArray(input)) return [];

    const unique = new Set<RegionCode>();
    for (const item of input) {
      if (typeof item !== 'string') continue;
      if (MVP_ALLOWED_REGION_CODES.has(item) || item.startsWith('seoul')) {
        unique.add(item as RegionCode);
      }
    }
    return Array.from(unique);
  }
}
