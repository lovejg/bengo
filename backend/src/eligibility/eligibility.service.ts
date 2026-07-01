import { Injectable } from '@nestjs/common';
import { EligibilityResult } from '../common/enums/eligibility-result.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { RegionCode, SEOUL_GU_MAP, regionMatches } from '../common/enums/region-code.enum';
import {
  RuleCondition,
  RuleDefinition,
  RuleNode,
} from '../common/interfaces/rule-expression.interface';
import { Policy, UserProfile } from '../database/entities';

interface EligibilityEvalInput {
  policy: Policy;
  profile: UserProfile;
  answers: Record<string, unknown>;
  rule?: RuleDefinition;
}

interface RuleEvalResult {
  passed: boolean;
  reasons: string[];
  hasUnverifiable: boolean;
}

export interface EligibilityEvaluation {
  result: EligibilityResult;
  reasons: string[];
  explanation: string;
}

@Injectable()
export class EligibilityService {
  evaluate(input: EligibilityEvalInput): EligibilityEvaluation {
    // INFO 정책은 자격판별 자체를 하지 않음
    if (input.policy.policyType === PolicyType.INFO) {
      return {
        result: EligibilityResult.ELIGIBLE,
        reasons: [],
        explanation: this.makeExplanation(EligibilityResult.ELIGIBLE, []),
      };
    }

    const reasons: string[] = [];

    // answers에 age/regionCode가 있으면 그 값을 우선 사용 (다른 사람 대리 판별 등)
    const effectiveAge = input.answers.age != null ? Number(input.answers.age) : input.profile.age;

    let effectiveRegion: RegionCode;
    if (input.answers.regionCode != null) {
      effectiveRegion = this.resolveRegionCode(String(input.answers.regionCode));
    } else {
      effectiveRegion = input.profile.regionCode;
    }

    const baseCheck = this.evaluateBaseConditions(
      input.policy,
      effectiveAge,
      effectiveRegion,
      input.profile,
    );
    reasons.push(...baseCheck.reasons);

    if (!baseCheck.passed) {
      return {
        result: EligibilityResult.INELIGIBLE,
        reasons,
        explanation: this.makeExplanation(EligibilityResult.INELIGIBLE, reasons),
      };
    }

    let hasUnverifiable = false;

    if (input.rule) {
      const facts = {
        profile: {
          age: effectiveAge,
          gender: input.profile.gender,
          regionCode: effectiveRegion,
          interests: input.profile.interests,
        },
        answers: input.answers,
        policy: {
          categories: input.policy.categories,
          regionCodes: input.policy.regionCodes,
        },
      };

      const ruleResult = input.rule.root
        ? this.evaluateRuleNode(input.rule.root, facts)
        : { passed: true, reasons: [], hasUnverifiable: false };
      reasons.push(...ruleResult.reasons);

      if (!ruleResult.passed) {
        return {
          result: EligibilityResult.INELIGIBLE,
          reasons,
          explanation: this.makeExplanation(EligibilityResult.INELIGIBLE, reasons),
        };
      }

      hasUnverifiable = ruleResult.hasUnverifiable;

      // 선착순/인원제한/심사/중복혜택·신청 hint만 CONDITIONAL 유발
      if (input.rule.conditionalHints && input.rule.conditionalHints.length > 0) {
        const hasBlockingHint = input.rule.conditionalHints.some((hint) =>
          /선착순|인원\s*제한|모집\s*마감|심사|면접|위원회\s*평가|중복\s*(혜택|신청)/.test(hint),
        );
        if (hasBlockingHint) {
          hasUnverifiable = true;
        }
      }
    }

    const hasAnyVerifiableData =
      input.policy.minAge !== null ||
      input.policy.maxAge !== null ||
      input.policy.targetGenders.length > 0 ||
      input.rule != null;

    if (!hasAnyVerifiableData) {
      return {
        result: EligibilityResult.CONDITIONAL,
        reasons: [
          '이 정책의 상세 자격 조건을 자동으로 확인할 수 없습니다. 공식 공고문에서 직접 확인해주세요.',
        ],
        explanation: this.makeExplanation(EligibilityResult.CONDITIONAL, [
          '이 정책의 상세 자격 조건을 자동으로 확인할 수 없습니다. 공식 공고문에서 직접 확인해주세요.',
        ]),
      };
    }

    if (hasUnverifiable) {
      const conditionalReasons =
        input.rule?.conditionalHints && input.rule.conditionalHints.length > 0
          ? input.rule.conditionalHints
          : ['일부 조건은 최종 심사를 통해 확인됩니다.'];
      return {
        result: EligibilityResult.CONDITIONAL,
        reasons: conditionalReasons,
        explanation: this.makeExplanation(EligibilityResult.CONDITIONAL, conditionalReasons),
      };
    }

    // LLM rule이 없을 때: APPLICATION은 CONDITIONAL
    if (!input.rule) {
      return {
        result: EligibilityResult.CONDITIONAL,
        reasons: [
          '기본 조건(나이/지역)은 충족하지만, 추가 자격 조건은 공식 공고문에서 확인이 필요합니다.',
        ],
        explanation: this.makeExplanation(EligibilityResult.CONDITIONAL, [
          '기본 조건(나이/지역)은 충족하지만, 추가 자격 조건은 공식 공고문에서 확인이 필요합니다.',
        ]),
      };
    }

    return {
      result: EligibilityResult.ELIGIBLE,
      reasons: [],
      explanation: this.makeExplanation(EligibilityResult.ELIGIBLE, []),
    };
  }

  private evaluateBaseConditions(
    policy: Policy,
    age: number,
    regionCode: RegionCode,
    profile: UserProfile,
  ): RuleEvalResult {
    const reasons: string[] = [];

    if (policy.minAge !== null && age < policy.minAge) {
      reasons.push(`최소 연령 ${policy.minAge}세 미만입니다.`);
    }

    if (policy.maxAge !== null && age > policy.maxAge) {
      reasons.push(`최대 연령 ${policy.maxAge}세를 초과했습니다.`);
    }

    if (policy.regionCodes.length > 0) {
      const isRegionMatch = policy.regionCodes.some((policyRegion) =>
        regionMatches(policyRegion, regionCode),
      );
      if (!isRegionMatch) {
        reasons.push('거주 지역 조건과 일치하지 않습니다.');
      }
    }

    if (policy.targetGenders.length > 0 && !policy.targetGenders.includes(profile.gender)) {
      reasons.push('성별 조건과 일치하지 않습니다.');
    }

    return {
      passed: reasons.length === 0,
      reasons,
      hasUnverifiable: false,
    };
  }

  private evaluateRuleNode(node: RuleNode, facts: Record<string, unknown>): RuleEvalResult {
    if (this.isCondition(node)) {
      const isUnverifiable = node.verifiable === false;
      // verifiable: false인 조건은 자동 판별 불가 → 항상 통과 + hasUnverifiable 플래그
      if (isUnverifiable) {
        return {
          passed: true,
          reasons: [],
          hasUnverifiable: true,
        };
      }
      const passed = this.evaluateCondition(node, facts);
      return {
        passed,
        reasons: passed ? [] : [node.message ?? `${node.fact} 조건을 충족하지 못했습니다.`],
        hasUnverifiable: false,
      };
    }

    if (node.all) {
      const evaluated = node.all.map((child) => this.evaluateRuleNode(child, facts));
      const failed = evaluated.filter((item) => !item.passed);
      return {
        passed: failed.length === 0,
        reasons: failed.flatMap((item) => item.reasons),
        hasUnverifiable: evaluated.some((item) => item.hasUnverifiable),
      };
    }

    if (node.any) {
      const evaluated = node.any.map((child) => this.evaluateRuleNode(child, facts));
      const passed = evaluated.some((item) => item.passed);
      // 통과한 분기 중 하나라도 완전히 검증 가능하면 불확실하지 않음
      // (예: age<=39 분기가 통과하면, militaryService verifiable:false 분기와 무관하게 ELIGIBLE)
      const passingItems = evaluated.filter((item) => item.passed);
      return {
        passed,
        reasons: passed ? [] : evaluated.flatMap((item) => item.reasons),
        hasUnverifiable: passed && passingItems.every((item) => item.hasUnverifiable),
      };
    }

    return {
      passed: true,
      reasons: [],
      hasUnverifiable: false,
    };
  }

  private evaluateCondition(condition: RuleCondition, facts: Record<string, unknown>): boolean {
    const actual = this.getFactValue(facts, condition.fact);
    const expected = condition.value;

    switch (condition.op) {
      case '=':
        return actual === expected;
      case '!=':
        // value가 배열이면 "not in" 의미로 처리
        if (Array.isArray(expected)) {
          return !expected.some((value) => value === actual);
        }
        return actual !== expected;
      case '>':
        return Number(actual) > Number(expected);
      case '>=':
        return Number(actual) >= Number(expected);
      case '<':
        return Number(actual) < Number(expected);
      case '<=':
        return Number(actual) <= Number(expected);
      case 'in': {
        if (!Array.isArray(expected)) return false;
        return expected.some((value) => value === actual);
      }
      case 'contains': {
        if (!Array.isArray(actual)) return false;
        return actual.some((value) => value === expected);
      }
      case 'region_match': {
        const userRegion = String(actual) as RegionCode;
        const policyRegions = Array.isArray(expected) ? expected : [expected];
        return policyRegions.some((pr) => regionMatches(String(pr) as RegionCode, userRegion));
      }
      default:
        return false;
    }
  }

  private getFactValue(facts: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (typeof current === 'object' && current !== null && key in current) {
        return (current as Record<string, unknown>)[key];
      }

      return undefined;
    }, facts);
  }

  /** 구 이름("관악구") 또는 enum 값("seoul_gwanak") → RegionCode 변환 */
  private resolveRegionCode(input: string): RegionCode {
    // 이미 enum 값이면 그대로
    if (Object.values(RegionCode).includes(input as RegionCode)) {
      return input as RegionCode;
    }
    // 구 이름이면 변환
    if (SEOUL_GU_MAP[input]) {
      return SEOUL_GU_MAP[input];
    }
    // 서울 전체
    if (input.includes('서울')) {
      return RegionCode.SEOUL;
    }
    return input as RegionCode;
  }

  private isCondition(node: RuleNode): node is RuleCondition {
    return 'fact' in node;
  }

  private makeExplanation(result: EligibilityResult, reasons: string[]): string {
    if (result === EligibilityResult.ELIGIBLE) {
      return '입력된 정보 기준으로 신청 가능성이 높습니다. 신청 전 공식 공고문에서 최종 조건을 확인하세요.';
    }

    if (result === EligibilityResult.CONDITIONAL) {
      return `기본 조건은 충족하지만, 최종 심사를 통해 확인되는 조건이 있습니다. ${reasons.join(' ')}`;
    }

    return `현재 입력 정보로는 신청이 어렵습니다. 사유: ${reasons.join(' ')}`;
  }
}
