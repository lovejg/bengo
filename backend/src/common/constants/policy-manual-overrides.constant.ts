import { RegionCode } from '../enums/region-code.enum';
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
  /** 정규화된 regionCodes를 강제 대체 (생활권자처럼 거주지 외 지역도 허용할 때) */
  regionCodes?: RegionCode[];
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
  // 관악 미취업청년 어학자격시험 응시료 지원 — 연 1회 통합 신청 조건이 LLM 미추출
  {
    code: 'data-go-kr-관악-미취업청년-어학자격시험-응시료-지원',
    appendConditionalHints: [
      '당해 연도에 응시한 시험을 통합하여 연 1회만 신청 가능합니다 (1인당 연 최대 10만원). 이미 해당 연도에 신청한 경우 지원 대상에서 제외됩니다.',
    ],
  },
  // 세대융합형 성공창업 지원 — 거주자 OR 생활권자 조건 (LLM 미추출)
  // regionCodes를 seoul로 확대해야 생활권자(타구 거주, 동대문구 활동)가 base check 통과 가능
  {
    code: 'data-go-kr-세대융합형-성공창업-지원',
    regionCodes: [RegionCode.SEOUL],
    overrideRule: {
      id: 'manual-세대융합형-성공창업-지원-region',
      name: '세대융합형 성공창업 지원 — 거주자 또는 생활권자',
      root: {
        all: [
          {
            any: [
              { fact: 'profile.regionCode', op: 'region_match', value: RegionCode.SEOUL_DONGDAEMUN, message: '동대문구 거주자여야 합니다.' },
              { fact: 'answers.livingArea', op: '=', value: true, verifiable: false, message: '동대문구 생활권자(직장·학교·활동)여야 합니다.' },
            ],
          },
          { fact: 'answers.applicantStatus', op: '=', value: '예비창업자', message: '공고일 현재 직장·건강보험 미가입자(예비창업자)만 가능합니다.', verifiable: true },
          { fact: 'answers.generationalFusion', op: '=', value: true, message: '세대융합형 창업 계획을 가지고 있어야 합니다.', verifiable: true },
        ],
      },
      conditionalHints: [
        '동일 또는 유사한 지자체·정부 사업으로부터 동일 기간 내 중복 지원을 받은 경우 제외됩니다.',
        '동대문구 생활권자(직장·학교·활동 근거지)인 경우에도 신청 가능합니다. 생활권 증빙서류 제출이 필요하니 공식 공고문을 확인하세요.',
      ],
    },
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
