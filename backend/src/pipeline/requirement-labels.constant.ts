/**
 * answers.{key} fact 키를 사용자에게 보여줄 한국어 레이블로 매핑.
 * manual override 규칙에서 사용되는 키들을 주로 포함하며,
 * 매핑이 없으면 message 필드를 fallback으로 사용한다.
 */
export const REQUIREMENT_KEY_LABELS: Record<string, string> = {
  monthlyIncome: '월 가구소득 (만원)',
  annualIncome: '연소득 (만원)',
  totalAssets: '총 자산 (만원)',
  depositAmount: '임차보증금 (만원)',

  // boolean 여부 조건
  militaryService: '제대군인 여부',
  livingArea: '동대문구 생활권자 여부',
  generationalFusion: '세대융합 창업 계획 여부',
  residencyOver1Year: '서초구 1년 이상 거주 여부',
  residencyOver1YearYangcheon: '양천구 1년 이상 거주 여부',
  continuousResidencySeongbuk: '성북구 계속 거주 여부 (2026.1.1. 이전부터)',
  qualificationExamTaken: '시험 응시 여부',
  guaranteeAgencyMember: '보증기관 가입 여부',
  competitionAward: '2년 이내 대회 3위권 입상 여부',
  incomeLevel: '기준중위소득 100% 이내 해당 여부',
  previousRecipient: '기선정자 여부 (2023~2025년)',

  // 중복 수혜 여부
  receivingNationalEmploymentSupport: '국민취업지원제도 수혜 여부',
  receivingSeoulYouthAllowance: '서울 청년수당 수혜 여부',
  receivingSimilarAssetProgram: '유사자산형성사업 참여 여부',
  receivingSimilarGovProgram: '정부·지자체 유사사업 참여 여부',
  receivingSimilarTenureProgram: '근속장려금 유사사업 참여 여부',
  receivingOtherScholarship: '타 장학금 수혜 여부',
  receivingNationalScholarship: '국가장학금 수혜 여부',
  receivingYouthIndependenceTransport: '서울시 자립준비청년 교통비 지원 수혜 여부',

  // 신청자·자격 상태
  applicantStatus: '신청자 상태',
  applicantType: '신청자 유형',
  tenantType: '신청자 유형',
  housingStatus: '입주(예정) 유형',
  educationLevel: '학생 유형',
  scholarshipType: '신청할 장학금 유형',
  isUnemployed: '미취업 여부',
  isEmployed: '근로 여부',
  isYouthLeavingCare: '자립준비청년(보호종료아동) 여부',
  isEnrolled: '대학교 재학 여부',
  isPreFounder: '예비창업자 여부',
  isBusinessActive: '사업체 정상 운영 여부',
  isSmallCompany: '중소기업 근무 여부',
  isHomeless: '무주택자 여부',

  // 숫자 조건
  yearsAfterFounding: '창업 후 경과 연수',
  gradeAverage: '직전학기 평균 등급',
};

export function formatKeyAsLabel(key: string, fallback: string): string {
  return REQUIREMENT_KEY_LABELS[key] ?? fallback;
}
