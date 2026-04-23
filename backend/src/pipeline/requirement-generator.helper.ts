import { createHash } from 'crypto';
import { QuestionType } from '../common/enums/question-type.enum';
import { RegionCode, SEOUL_GU_MAP } from '../common/enums/region-code.enum';
import { Policy, PolicyRequirement } from '../database/entities';
import { formatKeyAsLabel } from './requirement-labels.constant';

const GU_CODE_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(SEOUL_GU_MAP).map(([name, code]) => [code, name]),
);

/** LLM 입력이 되는 필드 기준 해시 — 변경 감지로 재생성 여부 판단 */
export function computePolicyContentHash(policy: Policy): string {
  const extra = (policy.extraMeta ?? {}) as Record<string, unknown>;
  const content = [
    policy.title,
    policy.description,
    policy.policyType,
    policy.regionCodes.join(','),
    String(extra.selectionCriteria ?? ''),
    String(extra.supportContent ?? ''),
    String(extra.warnBox ?? ''),
    String(extra.targetInfo ?? ''),
    String(extra.employmentStatus ?? ''),
  ].join('\x00');
  return createHash('md5').update(content).digest('hex');
}

export function buildAgeDescription(
  minAge: number | null,
  maxAge: number | null,
): string {
  if (minAge !== null && maxAge !== null) return `만 ${minAge}세 ~ ${maxAge}세`;
  if (minAge !== null) return `만 ${minAge}세 이상`;
  if (maxAge !== null) return `만 ${maxAge}세 이하`;
  return '';
}

export function getGuLabel(regionCodes: RegionCode[]): string {
  return regionCodes
    .filter((r) => r.startsWith('seoul_'))
    .map((r) => GU_CODE_TO_NAME[r] ?? r)
    .join(', ');
}

export function getSeoulGuOptions(): string[] {
  return Object.keys(SEOUL_GU_MAP);
}

const UNRESTRICTED_VALUES = new Set(['제한없음', '무관', '제한없는', '-', '해당없음', '']);

export function isUnrestricted(value: string): boolean {
  const normalized = value.trim().replace(/^[-·\s]+/, '').replace(/\s+/g, '');
  return UNRESTRICTED_VALUES.has(normalized);
}

/** override rule 트리에서 answers.* fact 조건을 requirements 후보로 변환 */
export function extractRequirementsFromRuleNode(
  node: Record<string, unknown>,
  policyId: string,
): Array<Partial<PolicyRequirement>> {
  const reqs: Array<Partial<PolicyRequirement>> = [];
  if (!node) return reqs;

  if ('fact' in node && typeof node.fact === 'string' && node.fact.startsWith('answers.')) {
    reqs.push(buildRequirementFromConditionNode(node, policyId));
  }

  for (const branchKey of ['all', 'any'] as const) {
    const branch = node[branchKey];
    if (Array.isArray(branch)) {
      for (const child of branch as Record<string, unknown>[]) {
        reqs.push(...extractRequirementsFromRuleNode(child, policyId));
      }
    }
  }

  return reqs;
}

function buildRequirementFromConditionNode(
  node: Record<string, unknown>,
  policyId: string,
): Partial<PolicyRequirement> {
  const key = (node.fact as string).replace('answers.', '');
  const message = typeof node.message === 'string' ? node.message : key;
  const { type, options } = inferQuestionType(node);

  return {
    policyId,
    key,
    label: formatKeyAsLabel(key, message),
    description: message,
    type,
    options,
    isRequired: true,
    displayOrder: 0,
  };
}

function inferQuestionType(node: Record<string, unknown>): {
  type: QuestionType;
  options: string[] | null;
} {
  if (typeof node.value === 'boolean') {
    return { type: QuestionType.BOOLEAN, options: null };
  }

  const isNumericComparison =
    typeof node.value === 'number' &&
    ['<=', '>=', '<', '>'].includes(String(node.op));
  if (isNumericComparison) {
    return { type: QuestionType.NUMBER, options: null };
  }

  if (node.op === 'in' && Array.isArray(node.value)) {
    const options = (node.value as unknown[]).filter(
      (v): v is string => typeof v === 'string',
    );
    return { type: QuestionType.SELECT, options };
  }

  return { type: QuestionType.STRING, options: null };
}

export function extractWarnBoxHints(extraMeta: Record<string, unknown>): string[] {
  const warnBox = extraMeta?.warnBox;
  if (typeof warnBox !== 'string' || !warnBox.trim()) return [];
  return [warnBox.trim()];
}

/** 선착순/조기 종료 힌트 — youthcenter 소스는 metadata 서브키에 중첩되는 경우가 있음 */
export function extractFirstComeHints(extraMeta: Record<string, unknown>): string[] {
  const hints: string[] = [];
  const nested = (extraMeta?.metadata as Record<string, unknown> | undefined) ?? {};

  const isFirstCome =
    extraMeta?.isFirstComeFirstServed === true ||
    nested?.isFirstComeFirstServed === true;
  if (isFirstCome) {
    hints.push('선착순 접수 정책입니다. 모집 마감 여부를 공식 공고문에서 확인하세요.');
  }

  const bizPeriodEtc = (extraMeta?.bizPeriodEtc ?? nested?.bizPeriodEtc) as string | undefined;
  if (typeof bizPeriodEtc === 'string' && bizPeriodEtc.trim() && /소진|마감|종료/.test(bizPeriodEtc)) {
    hints.push(`${bizPeriodEtc.trim()} 조기 종료될 수 있습니다.`);
  }

  return hints;
}

const CAPACITY_PATTERNS: readonly RegExp[] = [
  /선착순\s*[\d,]+\s*명/,
  /[\d,]+\s*명\s*(?:모집|선발|선정|내외|이내)/,
  /총\s*[\d,]+\s*명/,
  /지원\s*규모\s*[:\s]\s*[\d,]+\s*명/,
  /약\s*[\d,]+\s*여?\s*명/,
];

export function extractCapacityHints(description: string): string[] {
  if (!description) return [];
  for (const pattern of CAPACITY_PATTERNS) {
    const match = description.match(pattern);
    if (match) {
      return [
        `선착순/인원 제한이 있는 정책입니다 (${match[0].trim()}). 모집 마감 여부를 공식 공고문에서 확인하세요.`,
      ];
    }
  }
  return [];
}
