import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionType } from '../common/enums/question-type.enum';
import { RuleDefinition } from '../common/interfaces/rule-expression.interface';
import { Policy, PolicyRequirement, PolicyRule } from '../database/entities';
import { NormalizedPolicyDocument } from './interfaces/normalized-policy.interface';
import { LlmRuleExtractorService } from './llm-rule-extractor.service';

@Injectable()
export class PolicyRequirementGeneratorService {
  private readonly logger = new Logger(PolicyRequirementGeneratorService.name);

  constructor(
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
    if (typeof employmentStatus === 'string' && employmentStatus.trim()) {
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
    if (typeof educationReq === 'string' && educationReq.trim()) {
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
    if (typeof selectionCriteria === 'string' && selectionCriteria.trim()) {
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

    const llmResult = await this.llmExtractor.extractRules(policy, normalized);

    if (llmResult && llmResult.conditions.length > 0) {
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

    if (requirements.length === 0) {
      return;
    }

    await this.requirementRepository.save(
      requirements.map((r) => this.requirementRepository.create(r)),
    );
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
