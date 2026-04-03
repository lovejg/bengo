import { RuleDefinition } from '../interfaces/rule-expression.interface';


/**
 * 자동 파이프라인으로 처리 불가한 예외 정책 목록.
 * collect-and-ingest-mvp / regenerate-rules 실행 시에도 이 설정이 항상 적용됩니다.
 *
 * 사용 사례:
 * - 신청자 유형이 2개 이상(청년/어르신, 멘토/멘티)이어서 단일 rule로 표현 불가
 * - minAge/maxAge가 복수 신청층 중 하나 기준으로 잘못 잡히는 경우
 */
export interface PolicyManualOverride {
  /** policy.code 와 일치해야 함 */
  code: string;
  /** null로 지정하면 파이프라인 값을 무시하고 null로 저장 */
  minAge?: number | null;
  maxAge?: number | null;
  /** true이면 rule 생성/갱신 스킵 + 기존 rule 비활성화 (disableRule용 hints는 conditionalHints 사용) */
  disableRule?: boolean;
  /** disableRule: true일 때 사용할 hint 목록 (rule 전체 대체) */
  conditionalHints?: string[];
  /** LLM rule은 유지하면서 hint만 추가 (API 데이터에 없는 중복 불가 조건 등) */
  appendConditionalHints?: string[];
  /** LLM rule 전체를 이 rule로 교체 (복잡한 분기 조건을 수동 정의할 때) */
  overrideRule?: RuleDefinition;
}

export const POLICY_MANUAL_OVERRIDES: PolicyManualOverride[] = [
  // 한지붕세대공감 계열 — 청년(세입자) + 어르신(집주인) 두 신청층
  {
    code: 'youth-seoul-한지붕세대공감',
    minAge: null,
    maxAge: null,
    disableRule: true,
    conditionalHints: [
      '청년(세입자)과 어르신(집주인) 양쪽 모두 신청 가능합니다. 본인 유형에 맞는 조건을 공식 공고문에서 확인하세요.',
    ],
  },
  {
    code: 'youth-seoul-노장청-쉐어하우스-한지붕세대공감',
    minAge: null,
    maxAge: null,
    disableRule: true,
    conditionalHints: [
      '청년(세입자)과 어르신(집주인) 양쪽 모두 신청 가능합니다. 본인 유형에 맞는 조건을 공식 공고문에서 확인하세요.',
    ],
  },
  {
    code: 'youth-seoul-청년과-어르신-주거공유한지붕세대공감',
    minAge: null,
    maxAge: null,
    disableRule: true,
    conditionalHints: [
      '청년(세입자)과 어르신(집주인) 양쪽 모두 신청 가능합니다. 본인 유형에 맞는 조건을 공식 공고문에서 확인하세요.',
    ],
  },
  {
    code: 'youthcenter-policy-청년과-어르신-주거공유한지붕세대공감',
    minAge: null,
    maxAge: null,
    disableRule: true,
    conditionalHints: [
      '청년(세입자)과 어르신(집주인) 양쪽 모두 신청 가능합니다. 본인 유형에 맞는 조건을 공식 공고문에서 확인하세요.',
    ],
  },
  // 서울시 고립·은둔청년 지원사업 — 제대군인 나이 연장 분기 (base maxAge=39 → 42로 완화)
  {
    code: 'youth-seoul-서울시-고립은둔청년-지원사업',
    maxAge: 42,
    overrideRule: {
      id: 'manual-고립은둔청년-military-age',
      name: '서울시 고립·은둔청년 지원사업 — 제대군인 나이 연장',
      root: {
        any: [
          { fact: 'profile.age', op: '<=', value: 39 },
          { fact: 'answers.militaryService', op: '=', value: true, verifiable: false, message: '의무복무 제대군인이어야 합니다' },
        ],
      },
      conditionalHints: [
        '의무복무 제대군인은 군 복무기간에 따라 최대 3년 연장 지원됩니다. (1년 미만: 만 40세까지 / 1년 이상 2년 미만: 만 41세까지 / 2년 이상: 만 42세까지) 해당자는 공식 공고문에서 자격을 확인하세요.',
      ],
    },
  },
  // 서울광역청년센터 운영 — 제대군인 나이 연장 분기 (base maxAge=39 → 42로 완화)
  {
    code: 'youthcenter-policy-서울광역청년센터-운영',
    maxAge: 42,
    overrideRule: {
      id: 'manual-서울광역청년센터-military-age',
      name: '서울광역청년센터 운영 — 제대군인 나이 연장',
      root: {
        any: [
          { fact: 'profile.age', op: '<=', value: 39 },
          { fact: 'answers.militaryService', op: '=', value: true, verifiable: false, message: '의무복무 제대군인이어야 합니다' },
        ],
      },
      conditionalHints: [
        '의무복무 제대군인은 군 복무기간에 따라 최대 3년 연장 지원됩니다. (1년 미만: 만 40세까지 / 1년 이상 2년 미만: 만 41세까지 / 2년 이상: 만 42세까지) 해당자는 공식 공고문에서 자격을 확인하세요.',
      ],
    },
  },
  // 청년안심주택 임대보증금 — 중복 신청 불가 조건이 API 데이터에 없음
  {
    code: 'youth-seoul-서울시-청년안심주택공공지원민간임대-임대보증금-지원',
    appendConditionalHints: [
      '청년안심주택 임대보증금 지원과 서울시 청년 신혼부부 임차보증금 이자지원사업은 중복 신청이 불가합니다. 해당 사업 수혜 여부를 공식 공고문에서 확인하세요.',
    ],
  },
  // 미취업 청년 어학 및 자격증 응시료 지원(성북구) — 거주 기간 조건이 API 데이터에 없음
  {
    code: 'youthcenter-policy-미취업-청년-어학-및-자격증-응시료-지원성북구',
    appendConditionalHints: [
      '2026년 1월 1일 이전부터 신청일 현재까지 계속하여 성북구에 주민등록상 거주 중이어야 합니다. 해당 여부를 공식 공고문에서 확인하세요.',
    ],
  },
  // 청년 이사차량 지원(성동구) — API에 선착순여부 "N"으로 잘못 기록됨 (실제: 월 10명 미만 선착순)
  {
    code: 'youthcenter-policy-청년-이사차량-지원',
    appendConditionalHints: [
      '월 10명 미만 선착순 지원으로, 신청 전 성동구청년지원센터에서 가능 여부를 확인하세요.',
    ],
  },
  {
    code: 'youth-seoul-청년-이사차량-지원',
    appendConditionalHints: [
      '월 10명 미만 선착순 지원으로, 신청 전 성동구청년지원센터에서 가능 여부를 확인하세요.',
    ],
  },
  // 멘토링 지원 — 멘토(성인)와 멘티(청소년) 두 신청층
  {
    code: 'data-go-kr-멘토링-지원',
    minAge: null,
    maxAge: null,
    disableRule: true,
    conditionalHints: [
      '멘토(성인)와 멘티(청소년) 양쪽 모두 신청 가능합니다. 본인 유형에 맞는 조건을 공식 공고문에서 확인하세요.',
    ],
  },
];

export function getPolicyManualOverride(code: string): PolicyManualOverride | undefined {
  return POLICY_MANUAL_OVERRIDES.find((o) => o.code === code);
}
