import { EligibilityService } from './eligibility.service';
import { EligibilityResult } from '../common/enums/eligibility-result.enum';
import { Gender } from '../common/enums/gender.enum';
import { InterestCategory } from '../common/enums/interest-category.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { RegionCode } from '../common/enums/region-code.enum';
import { RuleDefinition } from '../common/interfaces/rule-expression.interface';
import { Policy, UserProfile } from '../database/entities';

/**
 * 적격성 엔진은 외부 의존성이 없는 순수 로직이므로 단위 테스트로 전체 분기를 검증한다.
 */
describe('EligibilityService', () => {
  let service: EligibilityService;

  beforeEach(() => {
    service = new EligibilityService();
  });

  const makePolicy = (overrides: Partial<Policy> = {}): Policy =>
    ({
      policyType: PolicyType.APPLICATION,
      categories: [InterestCategory.YOUTH],
      regionCodes: [],
      targetGenders: [],
      minAge: null,
      maxAge: null,
      ...overrides,
    }) as Policy;

  const makeProfile = (overrides: Partial<UserProfile> = {}): UserProfile =>
    ({
      age: 28,
      gender: Gender.MALE,
      regionCode: RegionCode.SEOUL_GWANAK,
      interests: [InterestCategory.YOUTH],
      ...overrides,
    }) as UserProfile;

  const rule = (def: Partial<RuleDefinition>): RuleDefinition => ({
    id: 'r1',
    name: 'test-rule',
    root: null,
    ...def,
  });

  describe('INFO 정책', () => {
    it('자격 판별 없이 항상 ELIGIBLE을 반환한다', () => {
      const result = service.evaluate({
        policy: makePolicy({ policyType: PolicyType.INFO, minAge: 99 }),
        profile: makeProfile({ age: 20 }),
        answers: {},
      });

      expect(result.result).toBe(EligibilityResult.ELIGIBLE);
    });
  });

  describe('기본 조건 (나이/지역/성별)', () => {
    it('최소 연령 미만이면 INELIGIBLE', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile({ age: 18 }),
        answers: {},
      });

      expect(result.result).toBe(EligibilityResult.INELIGIBLE);
      expect(result.reasons.join(' ')).toContain('최소 연령');
    });

    it('최대 연령 초과면 INELIGIBLE', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile({ age: 40 }),
        answers: {},
      });

      expect(result.result).toBe(EligibilityResult.INELIGIBLE);
      expect(result.reasons.join(' ')).toContain('최대 연령');
    });

    it('SEOUL 정책은 모든 서울 자치구 거주자에게 매칭된다', () => {
      const result = service.evaluate({
        policy: makePolicy({
          minAge: 19,
          maxAge: 39,
          regionCodes: [RegionCode.SEOUL],
        }),
        profile: makeProfile({ regionCode: RegionCode.SEOUL_MAPO }),
        answers: {},
      });

      // 기본 조건은 통과하지만 rule이 없으므로 CONDITIONAL (지역 불일치로 탈락하지 않음)
      expect(result.result).toBe(EligibilityResult.CONDITIONAL);
      expect(result.reasons.join(' ')).not.toContain('일치하지 않습니다');
    });

    it('자치구 한정 정책은 다른 자치구 거주자에게 INELIGIBLE', () => {
      const result = service.evaluate({
        policy: makePolicy({ regionCodes: [RegionCode.SEOUL_GANGNAM] }),
        profile: makeProfile({ regionCode: RegionCode.SEOUL_MAPO }),
        answers: {},
      });

      expect(result.result).toBe(EligibilityResult.INELIGIBLE);
      expect(result.reasons.join(' ')).toContain('지역');
    });

    it('성별 조건과 불일치하면 INELIGIBLE', () => {
      const result = service.evaluate({
        policy: makePolicy({ targetGenders: [Gender.FEMALE] }),
        profile: makeProfile({ gender: Gender.MALE }),
        answers: {},
      });

      expect(result.result).toBe(EligibilityResult.INELIGIBLE);
      expect(result.reasons.join(' ')).toContain('성별');
    });

    it('answers의 age/regionCode가 프로필 값보다 우선한다 (대리 판별)', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile({ age: 50 }),
        answers: { age: 25 },
      });

      expect(result.result).not.toBe(EligibilityResult.INELIGIBLE);
    });
  });

  describe('자동 판별 데이터가 전혀 없는 경우', () => {
    it('나이/성별/rule이 모두 없으면 CONDITIONAL', () => {
      const result = service.evaluate({
        policy: makePolicy(),
        profile: makeProfile(),
        answers: {},
      });

      expect(result.result).toBe(EligibilityResult.CONDITIONAL);
    });
  });

  describe('rule 트리 평가', () => {
    it('all 그룹 — 모든 조건 충족 시 ELIGIBLE', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile(),
        answers: { employmentStatus: '미취업' },
        rule: rule({
          root: {
            all: [
              {
                fact: 'answers.employmentStatus',
                op: '=',
                value: '미취업',
                verifiable: true,
                message: '미취업자만 가능합니다.',
              },
            ],
          },
        }),
      });

      expect(result.result).toBe(EligibilityResult.ELIGIBLE);
    });

    it('all 그룹 — 한 조건이라도 불충족이면 INELIGIBLE + 사유 노출', () => {
      const result = service.evaluate({
        policy: makePolicy(),
        profile: makeProfile(),
        answers: { employmentStatus: '재직중' },
        rule: rule({
          root: {
            all: [
              {
                fact: 'answers.employmentStatus',
                op: '=',
                value: '미취업',
                verifiable: true,
                message: '미취업자만 가능합니다.',
              },
            ],
          },
        }),
      });

      expect(result.result).toBe(EligibilityResult.INELIGIBLE);
      expect(result.reasons).toContain('미취업자만 가능합니다.');
    });

    it('any 그룹 — 하나라도 충족하면 통과', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile(),
        answers: { startupStatus: '예비창업자' },
        rule: rule({
          root: {
            any: [
              { fact: 'answers.startupStatus', op: '=', value: '창업자', verifiable: true },
              { fact: 'answers.startupStatus', op: '=', value: '예비창업자', verifiable: true },
            ],
          },
        }),
      });

      expect(result.result).toBe(EligibilityResult.ELIGIBLE);
    });

    it('verifiable: false 조건은 자동 통과하되 CONDITIONAL을 유발한다', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile(),
        answers: {},
        rule: rule({
          root: {
            all: [
              {
                fact: 'answers.incomeLevel',
                op: '=',
                value: true,
                verifiable: false,
                message: '중위소득 150% 이하 심사 필요',
              },
            ],
          },
        }),
      });

      expect(result.result).toBe(EligibilityResult.CONDITIONAL);
    });

    it('in 연산자 — 값이 목록에 포함되면 통과', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile(),
        answers: { housingStatus: '무주택' },
        rule: rule({
          root: {
            all: [
              {
                fact: 'answers.housingStatus',
                op: 'in',
                value: ['무주택', '전세'],
                verifiable: true,
              },
            ],
          },
        }),
      });

      expect(result.result).toBe(EligibilityResult.ELIGIBLE);
    });

    it('숫자 비교 연산자(<=) — 충족/불충족', () => {
      const base = {
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile(),
        rule: rule({
          root: {
            all: [
              {
                fact: 'answers.annualIncome',
                op: '<=' as const,
                value: 50000000,
                verifiable: true,
              },
            ],
          },
        }),
      };

      expect(service.evaluate({ ...base, answers: { annualIncome: 40000000 } }).result).toBe(
        EligibilityResult.ELIGIBLE,
      );
      expect(service.evaluate({ ...base, answers: { annualIncome: 60000000 } }).result).toBe(
        EligibilityResult.INELIGIBLE,
      );
    });

    it('conditionalHints에 심사성 문구가 있으면 CONDITIONAL', () => {
      const result = service.evaluate({
        policy: makePolicy({ minAge: 19, maxAge: 39 }),
        profile: makeProfile(),
        answers: {},
        rule: rule({
          root: null,
          conditionalHints: ['선착순 마감'],
        }),
      });

      expect(result.result).toBe(EligibilityResult.CONDITIONAL);
      expect(result.reasons).toContain('선착순 마감');
    });
  });
});
