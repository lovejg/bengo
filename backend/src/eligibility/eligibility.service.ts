import { Injectable } from '@nestjs/common';
import { EligibilityResult } from '../common/enums/eligibility-result.enum';
import { RegionCode, regionMatches } from '../common/enums/region-code.enum';
import { RuleCondition, RuleDefinition, RuleNode } from '../common/interfaces/rule-expression.interface';
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
    const reasons: string[] = [];

    const baseCheck = this.evaluateBaseConditions(input.policy, input.profile);
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
          age: input.profile.age,
          gender: input.profile.gender,
          regionCode: input.profile.regionCode,
          interests: input.profile.interests,
        },
        answers: input.answers,
        policy: {
          categories: input.policy.categories,
          regionCodes: input.policy.regionCodes,
        },
      };

      const ruleResult = this.evaluateRuleNode(input.rule.root, facts);
      reasons.push(...ruleResult.reasons);

      if (!ruleResult.passed) {
        return {
          result: EligibilityResult.INELIGIBLE,
          reasons,
          explanation: this.makeExplanation(EligibilityResult.INELIGIBLE, reasons),
        };
      }

      hasUnverifiable = ruleResult.hasUnverifiable;

      if (input.rule.conditionalHints && input.rule.conditionalHints.length > 0) {
        hasUnverifiable = true;
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

    return {
      result: EligibilityResult.ELIGIBLE,
      reasons: [],
      explanation: this.makeExplanation(EligibilityResult.ELIGIBLE, []),
    };
  }

  private evaluateBaseConditions(policy: Policy, profile: UserProfile): RuleEvalResult {
    const reasons: string[] = [];

    if (policy.minAge !== null && profile.age < policy.minAge) {
      reasons.push(`최소 연령 ${policy.minAge}세 미만입니다.`);
    }

    if (policy.maxAge !== null && profile.age > policy.maxAge) {
      reasons.push(`최대 연령 ${policy.maxAge}세를 초과했습니다.`);
    }

    if (policy.regionCodes.length > 0) {
      const isRegionMatch = policy.regionCodes.some((policyRegion) =>
        regionMatches(policyRegion, profile.regionCode),
      );
      if (!isRegionMatch) {
        reasons.push('거주 지역 조건과 일치하지 않습니다.');
      }
    }

    if (
      policy.targetGenders.length > 0 &&
      !policy.targetGenders.includes(profile.gender)
    ) {
      reasons.push('성별 조건과 일치하지 않습니다.');
    }

    return {
      passed: reasons.length === 0,
      reasons,
      hasUnverifiable: false,
    };
  }

  private evaluateRuleNode(
    node: RuleNode,
    facts: Record<string, unknown>,
  ): RuleEvalResult {
    if (this.isCondition(node)) {
      const passed = this.evaluateCondition(node, facts);
      const isUnverifiable = node.verifiable === false;
      return {
        passed,
        reasons: passed ? [] : [node.message ?? `${node.fact} 조건을 충족하지 못했습니다.`],
        hasUnverifiable: passed && isUnverifiable,
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
      return {
        passed,
        reasons: passed ? [] : evaluated.flatMap((item) => item.reasons),
        hasUnverifiable: passed && evaluated.some((item) => item.hasUnverifiable),
      };
    }

    return {
      passed: true,
      reasons: [],
      hasUnverifiable: false,
    };
  }

  private evaluateCondition(
    condition: RuleCondition,
    facts: Record<string, unknown>,
  ): boolean {
    const actual = this.getFactValue(facts, condition.fact);
    const expected = condition.value;

    switch (condition.op) {
      case '=':
        return actual === expected;
      case '!=':
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
        return policyRegions.some((pr) =>
          regionMatches(String(pr) as RegionCode, userRegion),
        );
      }
      default:
        return false;
    }
  }

  private getFactValue(facts: Record<string, unknown>, path: string): unknown {
    return path
      .split('.')
      .reduce<unknown>((current, key) => {
        if (typeof current === 'object' && current !== null && key in current) {
          return (current as Record<string, unknown>)[key];
        }

        return undefined;
      }, facts);
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
