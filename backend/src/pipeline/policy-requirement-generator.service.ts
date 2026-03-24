import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionType } from '../common/enums/question-type.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { RuleDefinition } from '../common/interfaces/rule-expression.interface';
import { Policy, PolicyRequirement, PolicyRule } from '../database/entities';
import { NormalizedPolicyDocument } from './interfaces/normalized-policy.interface';
import { LlmRuleExtractorService } from './llm-rule-extractor.service';

@Injectable()
export class PolicyRequirementGeneratorService {
  private readonly logger = new Logger(PolicyRequirementGeneratorService.name);

  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    @InjectRepository(PolicyRequirement)
    private readonly requirementRepository: Repository<PolicyRequirement>,
    @InjectRepository(PolicyRule)
    private readonly ruleRepository: Repository<PolicyRule>,
    private readonly llmExtractor: LlmRuleExtractorService,
  ) {}

  async generateForPolicy(
    policy: Policy,
    normalized: NormalizedPolicyDocument,
  ): Promise<void> {
    // 이미 requirements가 있으면 중복 생성하지 않는다 (재수집 시 보호).
    const existingCount = await this.requirementRepository.count({
      where: { policyId: policy.id },
    });
    if (existingCount > 0) {
      return;
    }

    const requirements: Array<Partial<PolicyRequirement>> = [];
    let displayOrder = 0;

    if (normalized.minAge !== null || normalized.maxAge !== null) {
      displayOrder += 1;
      requirements.push({
        policyId: policy.id,
        key: 'age',
        label: '나이',
        description: this.buildAgeDescription(normalized.minAge, normalized.maxAge),
        type: QuestionType.NUMBER,
        options: null,
        isRequired: false,
        displayOrder,
      });
    }

    const employmentStatus = normalized.extraMeta?.employmentStatus;
    if (typeof employmentStatus === 'string' && employmentStatus.trim() && !this.isUnrestricted(employmentStatus)) {
      displayOrder += 1;
      requirements.push({
        policyId: policy.id,
        key: 'employmentStatus',
        label: '취업 상태',
        description: employmentStatus.slice(0, 160),
        type: QuestionType.SELECT,
        options: ['재학', '취준', '재직', '자영업', '기타'],
        isRequired: false,
        displayOrder,
      });
    }

    const educationReq = normalized.extraMeta?.educationReq;
    if (typeof educationReq === 'string' && educationReq.trim() && !this.isUnrestricted(educationReq)) {
      displayOrder += 1;
      requirements.push({
        policyId: policy.id,
        key: 'educationRequirement',
        label: '학력',
        description: educationReq.slice(0, 160),
        type: QuestionType.SELECT,
        options: ['고졸 이하', '대학 재학', '대졸', '석사 이상', '무관'],
        isRequired: false,
        displayOrder,
      });
    }

    const selectionCriteria = normalized.extraMeta?.selectionCriteria;
    if (typeof selectionCriteria === 'string' && selectionCriteria.trim() && !this.isUnrestricted(selectionCriteria)) {
      displayOrder += 1;
      requirements.push({
        policyId: policy.id,
        key: 'selectionCriteria',
        label: '선정기준',
        description: selectionCriteria.slice(0, 500),
        type: QuestionType.STRING,
        options: null,
        isRequired: false,
        displayOrder,
      });
    }

    // INFO 타입 정책은 자격 조건 추출 불필요 (summary만 생성)
    const isInfoPolicy = normalized.policyType === PolicyType.INFO;
    const llmResult = await this.llmExtractor.extractRules(
      policy,
      normalized,
      isInfoPolicy,
    );

    if (!isInfoPolicy && llmResult && llmResult.conditions.length > 0) {
      const existingKeys = new Set(requirements.map((r) => r.key));

      for (const condition of llmResult.conditions) {
        if (existingKeys.has(condition.key)) continue;
        existingKeys.add(condition.key);

        displayOrder += 1;
        requirements.push({
          policyId: policy.id,
          key: condition.key,
          label: condition.label,
          description: condition.message || condition.label,
          type: condition.type,
          options: condition.options,
          isRequired: true,
          displayOrder,
        });
      }

      const ruleDefinition: RuleDefinition = {
        id: `rule-${policy.code}-llm-v1`,
        name: `${policy.title} LLM 추출 규칙`,
        root: {
          all: llmResult.conditions.map((c) => ({
            fact: c.fact,
            op: c.op,
            value: c.value,
            message: c.message,
            verifiable: c.verifiable,
          })),
        },
        conditionalHints: llmResult.conditionalHints,
      };

      await this.ruleRepository.save(
        this.ruleRepository.create({
          policyId: policy.id,
          version: 1,
          definition: ruleDefinition,
          isActive: true,
          notes: 'LLM auto-extracted',
        }),
      );

      this.logger.log(
        `Policy ${policy.code}: LLM extracted ${llmResult.conditions.length} conditions, ${llmResult.conditionalHints.length} hints`,
      );
    }

    // LLM이 감지한 나이 정보로 보완 (수집기가 나이를 못 가져온 경우)
    if (llmResult?.detectedAge && (policy.minAge === null && policy.maxAge === null)) {
      const { minAge, maxAge } = llmResult.detectedAge;
      if (minAge !== null || maxAge !== null) {
        policy.minAge = minAge;
        policy.maxAge = maxAge;
        this.logger.log(
          `Policy ${policy.code}: LLM detected age ${minAge}~${maxAge} (collector missed)`,
        );
      }
    }

    if (llmResult?.summary) {
      policy.shortDescription = llmResult.summary;
    }

    // 나이 또는 summary가 변경된 경우 한 번만 저장
    if (llmResult?.summary || llmResult?.detectedAge) {
      await this.policyRepository.save(policy);
    }

    if (requirements.length === 0) {
      return;
    }

    await this.requirementRepository.save(
      requirements.map((r) => this.requirementRepository.create(r)),
    );
  }

  private isUnrestricted(value: string): boolean {
    const normalized = value.trim().replace(/\s+/g, '');
    const patterns = ['제한없음', '무관', '제한없는', '-', '해당없음'];
    return patterns.some((p) => normalized === p);
  }

  private buildAgeDescription(
    minAge: number | null,
    maxAge: number | null,
  ): string {
    if (minAge !== null && maxAge !== null) {
      return `만 ${minAge}세 ~ ${maxAge}세`;
    }
    if (minAge !== null) {
      return `만 ${minAge}세 이상`;
    }
    if (maxAge !== null) {
      return `만 ${maxAge}세 이하`;
    }
    return '';
  }
}
