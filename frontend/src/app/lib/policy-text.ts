/**
 * 정책 카드/상세에서 공통으로 쓰는 표시용 텍스트 규칙.
 */

/** 백엔드 InterestCategory enum 값 → 화면 라벨 (한 곳에서 관리) */
export const POLICY_CATEGORY_LABELS: Record<string, string> = {
  youth_policy: '청년정책',
  childcare_policy: '육아정책',
  senior_policy: '노인정책',
  disability_policy: '장애인정책',
};

/** 매핑에 없는 코드는 영문 그대로 노출하지 않도록 null을 돌려준다 */
export function getCategoryLabel(code: string): string | null {
  return POLICY_CATEGORY_LABELS[code] ?? null;
}

/** 날짜를 못 읽었지만 원문 기간 문구가 있는 정책(periodRaw) — 목록의 "정책별 확인" 분류와 같은 표기 */
export const PERIOD_RAW_LABEL = '정책별 확인';
export const PERIOD_UNKNOWN_LABEL = '기간확인불가';

export function formatPolicyPeriod(
  startsAt?: string | null,
  endsAt?: string | null,
  isAlwaysOpen?: boolean,
  periodRaw?: string | null,
): string {
  if (isAlwaysOpen) return '상시모집';
  if (startsAt && endsAt) return `${startsAt.slice(0, 10)} ~ ${endsAt.slice(0, 10)}`;
  if (periodRaw) return isReadableOpenEndedPeriod(periodRaw) ? periodRaw.trim() : PERIOD_RAW_LABEL;
  return PERIOD_UNKNOWN_LABEL;
}

// "2025.12.22. ~ 예산 소진 시까지"처럼 시작일 + 숫자 없는 짧은 종료 문구로만 된 기간
const OPEN_ENDED_PERIOD = /^\s*\d{4}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}\.?\s*[~～]\s*([^\d~～*※()]{2,15})\s*$/;
const OPEN_ENDED_TAIL = /소진|마감|종료|선정|계속|까지/;

/** 원문 그대로 보여줘도 읽히는 기간인지 — 날짜 파서가 종료일을 못 만든 '시작일 ~ 예산 소진 시' 류 */
export function isReadableOpenEndedPeriod(raw: string): boolean {
  const m = raw.match(OPEN_ENDED_PERIOD);
  return Boolean(m && OPEN_ENDED_TAIL.test(m[1]));
}

// 공고문 원문의 항목 기호: □ ■ ◇ ◆ ○ ● ◦ ▶ ▷ ► ※ * 와 단독으로 쓰인 ㅇ / o / - / ·
const LEADING_MARKER = /(^|\n)\s*(?:[□■◇◆○●◦▶▷►※*]+|[ㅇo\-·•])\s+/g;
const INLINE_MARKER = /\s(?:[□■◇◆○●◦▶▷►※*]+|ㅇ|o)(?=\s)/g;

/** 카드 요약은 한 문단으로 보여주므로, 원문 항목 기호를 지우고 공백을 하나로 합친다. */
export function toCardSummary(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(LEADING_MARKER, '$1')
    .replace(INLINE_MARKER, ' ')
    .replace(/[□■◇◆▶▷►※]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
