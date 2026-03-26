import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionType } from '../common/enums/question-type.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { PolicyStatus } from '../common/enums/policy-status.enum';
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

  async regenerateAll(): Promise<{ total: number; processed: number; failed: number }> {
    // 1. 기존 requirements + LLM rules 전부 삭제
    const deletedReqs = await this.requirementRepository.createQueryBuilder()
      .delete().execute();
    const deletedRules = await this.ruleRepository.createQueryBuilder()
      .delete().where('notes = :notes', { notes: 'LLM auto-extracted' }).execute();
    this.logger.log(
      `Cleared ${deletedReqs.affected} requirements, ${deletedRules.affected} LLM rules`,
    );

    // 2. 모든 활성 정책에 대해 재생성
    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });

    // shortDescription 초기화 + periodRaw '-' 정리
    for (const p of policies) {
      p.shortDescription = p.description?.slice(0, 120) ?? '';
      if (p.periodRaw?.trim() === '-') {
        p.periodRaw = null;
      }
    }
    await this.policyRepository.save(policies);

    let processed = 0;
    let failed = 0;

    for (const policy of policies) {
      try {
        // DB에 저장된 policy 데이터로 NormalizedPolicyDocument 구성
        const normalized: NormalizedPolicyDocument = {
          code: policy.code,
          title: policy.title,
          shortDescription: policy.shortDescription ?? '',
          description: policy.description ?? '',
          providerName: policy.providerName ?? '',
          sourceUrl: policy.sourceUrl ?? null,
          applicationUrl: policy.applicationUrl ?? null,
          applicationMethod: policy.applicationMethod ?? null,
          categories: policy.categories ?? [],
          regionCodes: policy.regionCodes ?? [],
          minAge: policy.minAge,
          maxAge: policy.maxAge,
          startsAt: policy.startsAt,
          endsAt: policy.endsAt,
          isAlwaysOpen: policy.isAlwaysOpen,
          periodRaw: policy.periodRaw ?? null,
          policyType: policy.policyType,
          extraMeta: policy.extraMeta ?? {},
        };

        await this.generateForPolicy(policy, normalized);
        processed++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to regenerate for ${policy.code}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { total: policies.length, processed, failed };
  }

  async generateForPolicy(
    policy: Policy,
    normalized: NormalizedPolicyDocument,
  ): Promise<void> {
    // 이미 requirements가 있으면 중복 생성하지 않는다 (재수집 시 보호).
    const existingCount = await this.requirementRepository.count({
      where: { policyId: policy.id },
    });
    if (existingCount > 0) {
      // summary가 없으면 LLM summaryOnly 호출
      if (!policy.shortDescription || policy.shortDescription === policy.description?.slice(0, 120)) {
        const summaryResult = await this.llmExtractor.extractRules(policy, normalized, true);
        if (summaryResult?.summary) {
          policy.shortDescription = summaryResult.summary;
        }
        if (summaryResult?.policyType) {
          policy.policyType = summaryResult.policyType === 'info' ? PolicyType.INFO : PolicyType.APPLICATION;
        }
        const hasPeriod = policy.isAlwaysOpen || policy.startsAt || policy.endsAt;
        const rawEmpty = !policy.periodRaw || policy.periodRaw.trim() === '-';
        if (summaryResult?.detectedPeriod && (!hasPeriod || rawEmpty)) {
          if (summaryResult.detectedPeriod === 'always') {
            policy.isAlwaysOpen = true;
            policy.periodRaw = null;
          } else {
            policy.periodRaw = summaryResult.detectedPeriod;
          }
        }
        if (policy.isAlwaysOpen && policy.periodRaw?.trim() === '-') {
          policy.periodRaw = null;
        }
        if (summaryResult?.summary || summaryResult?.policyType || summaryResult?.detectedPeriod) {
          await this.policyRepository.save(policy);
        }
      }
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

    if (llmResult?.policyType) {
      policy.policyType = llmResult.policyType === 'info' ? PolicyType.INFO : PolicyType.APPLICATION;
    }

    // 기간 정보가 없거나 '-'인 경우 LLM 결과로 보완
    const hasMeaningfulPeriod = policy.isAlwaysOpen || policy.startsAt || policy.endsAt;
    const periodRawIsEmpty = !policy.periodRaw || policy.periodRaw.trim() === '-';
    if (llmResult?.detectedPeriod && (!hasMeaningfulPeriod || periodRawIsEmpty)) {
      if (llmResult.detectedPeriod === 'always') {
        policy.isAlwaysOpen = true;
        policy.periodRaw = null;
      } else {
        policy.periodRaw = llmResult.detectedPeriod;
      }
    }
    // isAlwaysOpen이 true인데 periodRaw가 '-'면 정리
    if (policy.isAlwaysOpen && policy.periodRaw?.trim() === '-') {
      policy.periodRaw = null;
    }

    // 변경된 필드가 있으면 한 번만 저장
    if (llmResult?.summary || llmResult?.detectedAge || llmResult?.policyType || llmResult?.detectedPeriod) {
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
