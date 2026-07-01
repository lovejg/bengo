import { RegionCode } from '../enums/region-code.enum';
import { PolicyType } from '../enums/policy-type.enum';
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
  /** LLM이 policyType을 오분류할 때 강제 고정 */
  policyType?: PolicyType;
}

export const POLICY_MANUAL_OVERRIDES: PolicyManualOverride[] = [
  // 한지붕세대공감 계열 — 청년(세입자) + 어르신(집주인) 두 신청층
  {
    code: 'youth-seoul-한지붕세대공감',
    minAge: null,
    maxAge: null,
    policyType: PolicyType.INFO,
    disableRule: true,
  },
  {
    code: 'youth-seoul-노장청-쉐어하우스-한지붕세대공감',
    minAge: null,
    maxAge: null,
    policyType: PolicyType.INFO,
    disableRule: true,
  },
  {
    code: 'youth-seoul-청년과-어르신-주거공유한지붕세대공감',
    minAge: null,
    maxAge: null,
    policyType: PolicyType.INFO,
    disableRule: true,
  },
  {
    code: 'youthcenter-policy-청년과-어르신-주거공유한지붕세대공감',
    minAge: null,
    maxAge: null,
    policyType: PolicyType.INFO,
    disableRule: true,
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
          {
            fact: 'answers.militaryService',
            op: '=',
            value: true,
            verifiable: true,
            message: '의무복무 제대군인이어야 합니다',
          },
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
          {
            fact: 'answers.militaryService',
            op: '=',
            value: true,
            verifiable: true,
            message: '의무복무 제대군인이어야 합니다',
          },
        ],
      },
      conditionalHints: [
        '의무복무 제대군인은 군 복무기간에 따라 최대 3년 연장 지원됩니다. (1년 미만: 만 40세까지 / 1년 이상 2년 미만: 만 41세까지 / 2년 이상: 만 42세까지) 해당자는 공식 공고문에서 자격을 확인하세요.',
      ],
    },
  },
  // 청년안심주택 공급활성화(임차보증금 무이자지원) — LLM이 소득·자산 값을 원 단위·boolean으로 잘못 추출
  // 원 단위 값을 만원 단위로 수정, type number로 교체
  {
    code: 'youthcenter-policy-청년안심주택-공급활성화임차보증금-무이자지원',
    overrideRule: {
      id: 'manual-청년안심주택-공급활성화-income-assets',
      name: '청년안심주택 공급활성화(임차보증금 무이자지원) — 소득·자산 기준',
      root: {
        all: [
          // 신청자 유형 SELECT — requirements 추출 시 SELECT로 잡히도록 top-level에 배치
          {
            fact: 'answers.applicantType',
            op: 'in',
            value: ['청년', '신혼부부'],
            message: '청년 또는 신혼부부만 신청 가능합니다.',
            verifiable: true,
          },
          // 입주 유형 SELECT
          {
            fact: 'answers.housingStatus',
            op: 'in',
            value: [
              '청년안심주택 입주자',
              '청년안심주택 입주예정자',
              '민간임대주택 입주자',
              '민간임대주택 입주예정자',
            ],
            message: '청년안심주택 또는 민간임대주택 입주(예정)자만 신청 가능합니다.',
            verifiable: true,
          },
          // 유형별 소득·자산 분기
          {
            any: [
              {
                all: [
                  { fact: 'answers.applicantType', op: '=', value: '청년', verifiable: true },
                  {
                    fact: 'answers.monthlyIncome',
                    op: '<=',
                    value: 477,
                    message: '청년은 도시근로자 가구당 월평균소득 100% 이하(477만원)여야 합니다.',
                    verifiable: true,
                  },
                  {
                    fact: 'answers.totalAssets',
                    op: '<=',
                    value: 27300,
                    message: '청년은 총 자산 2억 7,300만원 이하여야 합니다.',
                    verifiable: true,
                  },
                ],
              },
              {
                all: [
                  { fact: 'answers.applicantType', op: '=', value: '신혼부부', verifiable: true },
                  {
                    fact: 'answers.monthlyIncome',
                    op: '<=',
                    value: 572,
                    message:
                      '신혼부부는 도시근로자 가구당 월평균소득 120% 이하(572만원)여야 합니다.',
                    verifiable: true,
                  },
                  {
                    fact: 'answers.totalAssets',
                    op: '<=',
                    value: 34500,
                    message: '신혼부부는 총 자산 3억 4,500만원 이하여야 합니다.',
                    verifiable: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      conditionalHints: [],
    },
  },
  // 청년안심주택 임대보증금 — 중복 신청 불가 조건이 API 데이터에 없음
  {
    code: 'youth-seoul-서울시-청년안심주택공공지원민간임대-임대보증금-지원',
    appendConditionalHints: [
      '청년안심주택 임대보증금 지원과 서울시 청년 신혼부부 임차보증금 이자지원사업은 중복 신청이 불가합니다. 해당 사업 수혜 여부를 공식 공고문에서 확인하세요.',
    ],
  },
  // 관악 미취업청년 어학자격시험 응시료 지원 — 국민취업지원제도·서울 청년수당 중복 불가 조건 추가
  {
    code: 'data-go-kr-관악-미취업청년-어학자격시험-응시료-지원',
    overrideRule: {
      id: 'manual-관악-미취업청년-어학-duplicate-benefit',
      name: '관악 미취업청년 어학자격시험 응시료 지원 — 중복 혜택 불가 조건',
      root: {
        all: [
          {
            fact: 'answers.isUnemployed',
            op: '=',
            value: true,
            message: '미취업 청년만 신청 가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.businessRegistration',
            op: '=',
            value: false,
            message: '사업자 미등록 상태여야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.qualificationExamTaken',
            op: '=',
            value: true,
            message: '2026년 1월 1일 이후 응시한 어학·자격증 시험이 있어야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingNationalEmploymentSupport',
            op: '=',
            value: false,
            message: '국민취업지원제도를 지원받고 있는 경우 중복 신청이 불가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingSeoulYouthAllowance',
            op: '=',
            value: false,
            message: '서울 청년수당을 받고 있는 경우 중복 신청이 불가능합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [
        '당해 연도에 응시한 시험을 통합하여 연 1회만 신청 가능합니다 (1인당 연 최대 10만원). 이미 해당 연도에 신청한 경우 지원 대상에서 제외됩니다.',
      ],
    },
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
              {
                fact: 'profile.regionCode',
                op: 'region_match',
                value: RegionCode.SEOUL_DONGDAEMUN,
                message: '동대문구 거주자여야 합니다.',
              },
              {
                fact: 'answers.livingArea',
                op: '=',
                value: true,
                verifiable: true,
                message: '동대문구 생활권자(직장·학교·활동)여야 합니다.',
              },
            ],
          },
          {
            fact: 'answers.isPreFounder',
            op: '=',
            value: true,
            message: '공고일 현재 직장·건강보험 미가입자(예비창업자)만 가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.generationalFusion',
            op: '=',
            value: true,
            message: '세대융합형 창업 계획을 가지고 있어야 합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [
        '동일 또는 유사한 지자체·정부 사업으로부터 동일 기간 내 중복 지원을 받은 경우 제외됩니다.',
        '동대문구 생활권자(직장·학교·활동 근거지)인 경우에도 신청 가능합니다. 생활권 증빙서류 제출이 필요하니 공식 공고문을 확인하세요.',
      ],
    },
  },
  // 동작 청년내일근속지원 — 잘못 추출된 근속기간 조건 제거 + 유사사업 중복지원 불가 조건 추가
  // LLM이 "2년간 최대 200만원 지급" 지원내용을 근속 기간 eligibility 조건으로 오해
  {
    code: 'data-go-kr-동작-청년내일근속지원',
    overrideRule: {
      id: 'manual-동작-청년내일근속지원-duplicate-benefit',
      name: '동작 청년내일근속지원 — 유사사업 중복지원 불가 조건',
      root: {
        all: [
          {
            fact: 'answers.employmentStatus',
            op: 'in',
            value: ['정규직 재직중', '정규직 신규채용'],
            message: '동작구 소재 중소기업에 정규직으로 취업해야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.isSmallCompany',
            op: '=',
            value: true,
            message: '동작구 소재 중소기업에 근무해야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingSimilarTenureProgram',
            op: '=',
            value: false,
            message: '정부 및 타 지자체 근속장려금 성격의 유사 사업 중복지원은 불가합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [],
    },
  },
  // 창업지원센터 운영 — 정부·지자체 유사사업 중복 참여 불가 조건 추가
  {
    code: 'data-go-kr-창업지원센터-운영',
    overrideRule: {
      id: 'manual-창업지원센터-운영-duplicate-benefit',
      name: '창업지원센터 운영 — 유사사업 중복 참여 불가 조건',
      root: {
        all: [
          {
            fact: 'answers.applicantType',
            op: 'in',
            value: ['예비창업자', '창업자'],
            message: '예비창업자 또는 창업자만 신청 가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.yearsAfterFounding',
            op: '<=',
            value: 7,
            message: '창업 7년 이내여야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.isBusinessActive',
            op: '=',
            value: true,
            message: '휴폐업 중인 자는 신청할 수 없습니다.',
            verifiable: true,
          },
          {
            fact: 'answers.taxDelinquency',
            op: '=',
            value: false,
            message: '국세·지방세 체납 기업은 신청할 수 없습니다.',
            verifiable: true,
          },
          {
            fact: 'answers.pollutingBusiness',
            op: '=',
            value: false,
            message: '환경관련 법규에 저촉되는 공해 배출업은 신청할 수 없습니다.',
            verifiable: true,
          },
          {
            fact: 'answers.prohibitedBusiness',
            op: '=',
            value: false,
            message:
              '일반유흥주점업, 무도유흥주점업, 사행시설 관리 및 운영업 등 제외 업종은 신청할 수 없습니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingSimilarGovProgram',
            op: '=',
            value: false,
            message:
              '정부·지방자치단체에서 운영하는 유사사업 중복 참여(수혜)자는 신청할 수 없습니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [
        '입주심사는 기업의 사업설명(PT) 및 질의응답 후 심사표에 의해 위원별 점수부여로 진행되며, 평균 60점 이상 기업 중 고득점 순으로 선정됩니다.',
      ],
    },
  },
  // 으뜸관악 청년통장 지원 — 유사자산형성사업 중복 참여 불가 조건 추가
  {
    code: 'data-go-kr-으뜸관악-청년통장-지원',
    overrideRule: {
      id: 'manual-으뜸관악-청년통장-duplicate-benefit',
      name: '으뜸관악 청년통장 지원 — 유사자산형성사업 중복 불가 조건',
      root: {
        all: [
          {
            fact: 'answers.isEmployed',
            op: '=',
            value: true,
            message: '근로 청년만 신청 가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingSimilarAssetProgram',
            op: '=',
            value: false,
            message:
              '희망두배청년통장, 청년내일저축계좌, 청년내일채움공제 등 유사자산형성사업에 참여 중인 경우 중복 신청이 불가능합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [],
    },
  },
  // 서리풀 희망사다리 자립정착금 — 서초구 1년 이상 거주 조건이 API 데이터에 없음
  {
    code: 'data-go-kr-서리풀-희망사다리-프로젝트-자립준비청년보호종료아동-자립정착금-지원',
    overrideRule: {
      id: 'manual-서리풀-자립정착금-residency',
      name: '서리풀 희망사다리 자립정착금 — 서초구 1년 이상 거주',
      root: {
        all: [
          {
            fact: 'answers.isYouthLeavingCare',
            op: '=',
            value: true,
            message: '자립준비청년(보호종료아동)만 신청 가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.residencyOver1Year',
            op: '=',
            value: true,
            message: '서초구에서 1년 이상 거주 중이어야 합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [],
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
  // 2026 서울청년문화패스 — 제대군인 연령 가산 (base: 21~23세 → 복무기간에 따라 최대 26세)
  {
    code: 'youth-seoul-2026-서울청년문화패스',
    maxAge: 26,
    overrideRule: {
      id: 'manual-서울청년문화패스-military-age',
      name: '2026 서울청년문화패스 — 제대군인 연령 가산',
      root: {
        all: [
          {
            any: [
              { fact: 'profile.age', op: '<=', value: 23 },
              {
                all: [
                  {
                    fact: 'answers.militaryService',
                    op: '=',
                    value: true,
                    verifiable: true,
                    message: '의무복무 제대군인이어야 합니다 (24~26세 해당자)',
                  },
                  { fact: 'profile.age', op: '<=', value: 26 },
                ],
              },
            ],
          },
          {
            fact: 'answers.incomeLevel',
            op: '=',
            value: true,
            message: '중위소득 150% 이하여야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.previousRecipient',
            op: '=',
            value: false,
            message: '2023~2025년 서울청년문화패스 기선정자는 신청할 수 없습니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [
        '제대군인의 경우 복무기간에 따라 최대 3년 이내 연령 가산 가능합니다. (1년 미만: 만 24세까지 / 1년 이상 2년 미만: 만 25세까지 / 2년 이상: 만 26세까지)',
        '소득 기준은 건강보험료 본인부담금 기준이며, 신청자가 지역 세대원 또는 직장 피부양자인 경우 부양자 부과액 기준으로 적용됩니다.',
        '선착순/인원 제한이 있는 정책입니다 (약 50,000명). 모집 마감 여부를 공식 공고문에서 확인하세요.',
      ],
    },
  },
  // 저소득계층 대학생 교통비 지원 — 서울시 자립준비청년 교통비 지원사업 중복 불가 조건 추가
  {
    code: 'data-go-kr-저소득계층-대학생-교통비-지원',
    overrideRule: {
      id: 'manual-저소득계층-대학생-교통비-duplicate-benefit',
      name: '저소득계층 대학생 교통비 지원 — 중복 수혜 불가 조건',
      root: {
        all: [
          {
            fact: 'answers.welfareStatus',
            op: 'in',
            value: ['기초수급자', '차상위계층', '한부모가족'],
            message: '기초수급자, 차상위계층, 또는 한부모가족에 해당해야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.isEnrolled',
            op: '=',
            value: true,
            message: '대학교에 재학 중이어야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingYouthIndependenceTransport',
            op: '=',
            value: false,
            message:
              '서울시 자립준비청년 교통비 지원사업을 받고 있는 경우 중복 신청이 불가능합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [],
    },
  },
  // 용산구 Y-리더 장학금 지급 — 타 장학금·국가장학금 중복 불가 조건 추가
  // 대학생: 타 장학금 AND 국가장학금 모두 중복 불가 / 초중고생: 타 장학금만 중복 불가
  {
    code: 'data-go-kr-용산구-y-리더-장학금-지급',
    overrideRule: {
      id: 'manual-용산구-y-리더-장학금-duplicate-benefit',
      name: '용산구 Y-리더 장학금 지급 — 중복 수혜 불가 조건',
      root: {
        all: [
          {
            fact: 'answers.educationLevel',
            op: 'in',
            value: ['초등학생', '중학생', '고등학생', '대학생'],
            message: '초등학생, 중학생, 고등학생, 대학생만 신청 가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.scholarshipCategory',
            op: 'in',
            value: ['일반 장학생', '지역사회봉사 장학생', '성적 우수 장학생', '특기 장학생'],
            message: '해당하는 장학금 유형을 선택해야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingOtherScholarship',
            op: '=',
            value: false,
            message: '당해 연도 타 장학금을 수혜받았거나 받을 예정인 경우 신청할 수 없습니다.',
            verifiable: true,
          },
          {
            any: [
              { fact: 'answers.educationLevel', op: '!=', value: '대학생' },
              {
                fact: 'answers.receivingNationalScholarship',
                op: '=',
                value: false,
                message: '대학생의 경우 국가장학금과 중복수혜가 불가합니다.',
                verifiable: true,
              },
            ],
          },
        ],
      },
      conditionalHints: [
        '장학금 지급 기준 및 금액은 매년 시행 공고문을 통해 달라질 수 있으니 공식 공고문을 확인하세요.',
      ],
    },
  },
  // 청년 취업준비 비용 지원사업 — "통합 1회 신청" 안내가 LLM 미추출
  {
    code: 'data-go-kr-청년-취업준비-비용-지원사업',
    appendConditionalHints: [
      '당해연도에 응시한 자격시험·면접을 통합하여 연 1회만 신청 가능합니다. 이미 해당 연도에 신청한 이력이 있다면 지원 대상에서 제외됩니다.',
    ],
  },
  // 청년 국가자격시험 응시료 지원 — 국민취업지원제도·서울 청년수당 중복 불가 조건 추가
  {
    code: 'data-go-kr-청년-국가자격시험-응시료-지원',
    overrideRule: {
      id: 'manual-청년-국가자격시험-응시료-duplicate-benefit',
      name: '청년 국가자격시험 응시료 지원 — 중복 혜택 불가 조건',
      root: {
        all: [
          {
            fact: 'answers.isUnemployed',
            op: '=',
            value: true,
            message: '미취업자이면서 사업자등록사실이 없어야 합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingNationalEmploymentSupport',
            op: '=',
            value: false,
            message: '국민취업지원제도를 지원받고 있는 경우 중복 신청이 불가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.receivingSeoulYouthAllowance',
            op: '=',
            value: false,
            message: '서울 청년수당을 받고 있는 경우 중복 신청이 불가능합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [],
    },
  },
  // 취약계층을 위한 공공일자리 제공 — 수집기가 제공기관 주소(영등포구청)를 정책 대상 지역으로 잘못 추출
  {
    code: 'data-go-kr-취약계층을-위한-공공일자리-제공',
    regionCodes: [RegionCode.SEOUL],
  },
  // 서울시 전세보증금 반환보증 보증료 지원 — 운영기관(마포구청) 주소가 지역으로 잘못 추출됨 + LLM이 소득·보증금을 원 단위로 추출 (만원 단위로 재설정)
  {
    code: 'data-go-kr-서울시-전세보증금-반환보증-보증료-지원',
    regionCodes: [RegionCode.SEOUL],
    overrideRule: {
      id: 'manual-전세보증금-반환보증-보증료-income-unit',
      name: '서울시 전세보증금 반환보증 보증료 지원 — 소득·보증금 만원 단위 수정',
      root: {
        all: [
          // top-level에 배치해야 extractRequirementsFromRuleNode가 SELECT로 추출
          {
            fact: 'answers.tenantType',
            op: 'in',
            value: ['청년', '신혼부부', '기타'],
            message: '신청자 유형을 선택해주세요.',
            verifiable: true,
          },
          {
            fact: 'answers.isHomeless',
            op: '=',
            value: true,
            message: '무주택자만 신청 가능합니다.',
            verifiable: true,
          },
          {
            fact: 'answers.depositAmount',
            op: '<=',
            value: 30000,
            message: '임차보증금이 3억원을 초과하였습니다.',
            verifiable: true,
          },
          {
            fact: 'answers.guaranteeAgencyMember',
            op: '=',
            value: true,
            message: '보증기관에 가입한 자만 신청 가능합니다.',
            verifiable: true,
          },
          // 유형별 연소득 분기 (만원 단위)
          {
            any: [
              {
                all: [
                  { fact: 'answers.tenantType', op: '=', value: '청년', verifiable: true },
                  {
                    fact: 'answers.annualIncome',
                    op: '<=',
                    value: 5000,
                    message: '청년은 연소득 5천만원 이하여야 합니다.',
                    verifiable: true,
                  },
                ],
              },
              {
                all: [
                  { fact: 'answers.tenantType', op: '=', value: '신혼부부', verifiable: true },
                  {
                    fact: 'answers.annualIncome',
                    op: '<=',
                    value: 7500,
                    message: '신혼부부는 연소득 7천5백만원 이하여야 합니다.',
                    verifiable: true,
                  },
                ],
              },
              {
                all: [
                  { fact: 'answers.tenantType', op: '=', value: '기타', verifiable: true },
                  {
                    fact: 'answers.annualIncome',
                    op: '<=',
                    value: 6000,
                    message: '기타는 연소득 6천만원 이하여야 합니다.',
                    verifiable: true,
                  },
                ],
              },
            ],
          },
        ],
      },
      conditionalHints: [
        '2025년 3월 31일 이후 보증 가입자는 최대 40만원 지원, 이전 가입자는 최대 30만원 지원됩니다.',
        '청년외(기타)는 보증료의 90%만 지원됩니다.',
      ],
    },
  },
  // 서리풀 희망사다리 자립컨설팅 지원 — "컨설팅" 표현 때문에 LLM이 info로 오분류 (다른 서리풀 정책들은 APPLICATION이라 카테고리 일치 필요)
  {
    code: 'data-go-kr-서리풀-희망사다리-프로젝트-자립준비청년보호종료아동-자립컨설팅-지원',
    policyType: PolicyType.APPLICATION,
  },
  // 서울시 가족돌봄청년 지원사업 WAY — "자원 안내 및 연결" 표현 때문에 LLM이 info로 오분류 (실제: 별도 공고 통해 생활비·병원비 등 신청형)
  {
    code: 'youth-seoul-서울시-가족돌봄청년-지원사업-way',
    policyType: PolicyType.APPLICATION,
  },
  // 양천구 장학금 지원 — 3가지 장학금 유형별 분기 + 중복혜택 불가
  {
    code: 'data-go-kr-양천구-장학금-지원',
    overrideRule: {
      id: 'manual-양천구-장학금-지원',
      name: '양천구 장학금 지원 — 학생 유형·장학금 유형 분기',
      root: {
        all: [
          // 공통: 양천구 1년 이상 거주
          {
            fact: 'answers.residencyOver1YearYangcheon',
            op: '=',
            value: true,
            message: '공고일 기준 양천구 1년 이상 거주자만 신청 가능합니다.',
            verifiable: true,
          },
          // 공통: 학생 유형 SELECT
          {
            fact: 'answers.educationLevel',
            op: 'in',
            value: ['초등학생', '중학생', '고등학생', '대학생'],
            message: '초·중·고·대학생만 신청 가능합니다.',
            verifiable: true,
          },
          // 장학금 유형 SELECT (top-level 배치)
          {
            fact: 'answers.scholarshipType',
            op: 'in',
            value: ['일반장학생', '성적우수장학생', '특기장학생'],
            message: '신청할 장학금 유형을 선택해주세요.',
            verifiable: true,
          },
          // 유형별 자격 분기
          {
            any: [
              {
                all: [
                  {
                    fact: 'answers.scholarshipType',
                    op: '=',
                    value: '일반장학생',
                    verifiable: true,
                  },
                  {
                    fact: 'answers.educationLevel',
                    op: 'in',
                    value: ['고등학생', '대학생'],
                    verifiable: true,
                  },
                  {
                    fact: 'answers.incomeLevel',
                    op: '=',
                    value: true,
                    message:
                      '일반장학생은 소득인정액이 기준중위소득 100% 이내여야 합니다 (대학생: 한국장학재단 학자금 지원구간 5구간 이내).',
                    verifiable: true,
                  },
                ],
              },
              {
                all: [
                  {
                    fact: 'answers.scholarshipType',
                    op: '=',
                    value: '성적우수장학생',
                    verifiable: true,
                  },
                  { fact: 'answers.educationLevel', op: '=', value: '고등학생', verifiable: true },
                  {
                    fact: 'answers.gradeAverage',
                    op: '<=',
                    value: 2.75,
                    message:
                      '성적우수장학생은 직전학기 과목별 석차등급 평균이 2.75등급 이내여야 합니다.',
                    verifiable: true,
                  },
                ],
              },
              {
                all: [
                  {
                    fact: 'answers.scholarshipType',
                    op: '=',
                    value: '특기장학생',
                    verifiable: true,
                  },
                  {
                    fact: 'answers.educationLevel',
                    op: 'in',
                    value: ['초등학생', '중학생', '고등학생'],
                    verifiable: true,
                  },
                  {
                    fact: 'answers.competitionAward',
                    op: '=',
                    value: true,
                    message:
                      '특기장학생은 2년 이내 광역시·도단위 이상 대회에서 3위권 이내 입상 이력이 있어야 합니다.',
                    verifiable: true,
                  },
                ],
              },
            ],
          },
          // 중복혜택 불가
          {
            fact: 'answers.receivingOtherScholarship',
            op: '=',
            value: false,
            message:
              '국가·타 지자체·민간단체 장학금 수혜자는 신청할 수 없습니다. (단, 대학생이 등록금에 미달하는 장학금을 받는 경우는 제외)',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [
        '대학생이 등록금에 미달하는 장학금을 받는 경우는 중복 수혜 제한에서 제외됩니다.',
        '중위소득·한부모·다자녀 등을 추가 고려하여 선발하며, 예산 범위 내에서 지급됩니다.',
      ],
    },
  },
  // 강서구 사랑의 PC 나눔센터 — "센터" 명칭 때문에 LLM이 info로 오분류 (실제: 선착순 신청형)
  {
    code: 'data-go-kr-강서구-사랑의-pc-나눔센터',
    policyType: PolicyType.APPLICATION,
    appendConditionalHints: [
      '선착순 보급 정책입니다. 2년 이내 기보급자는 신청할 수 없습니다. 모집 마감 여부를 공식 공고문에서 확인하세요.',
    ],
  },
  // 멘토링 지원 — 멘토(성인)와 멘티(청소년) 두 신청층
  // 성북구 어학·자격증 응시료 — 2026.1.1 이전부터 계속 거주 조건
  {
    code: 'youthcenter-policy-미취업-청년-어학-및-자격증-응시료-지원성북구',
    appendConditionalHints: ['예산 소진 시 조기 종료될 수 있습니다.'],
    overrideRule: {
      id: 'manual-성북구-어학자격증-residency',
      name: '성북구 어학·자격증 응시료 — 계속 거주 조건',
      root: {
        all: [
          {
            fact: 'answers.continuousResidencySeongbuk',
            op: '=',
            value: true,
            message:
              '2026.1.1. 이전부터 현재까지 계속하여 성북구에 주민등록상 거주 중이어야 합니다.',
            verifiable: true,
          },
        ],
      },
      conditionalHints: [],
    },
  },
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
