import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionType } from '../common/enums/question-type.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { PolicyStatus } from '../common/enums/policy-status.enum';
import { RuleDefinition } from '../common/interfaces/rule-expression.interface';
import { Policy, PolicyRequirement, PolicyRule } from '../database/entities';
import { NormalizedPolicyDocument } from './interfaces/normalized-policy.interface';
import { LlmExtractionResult, LlmRuleExtractorService } from './llm-rule-extractor.service';
import {
  getPolicyManualOverride,
  PolicyManualOverride,
} from '../common/constants/policy-manual-overrides.constant';
import {
  buildAgeDescription,
  computePolicyContentHash,
  extractCapacityHints,
  extractFirstComeHints,
  extractRequirementsFromRuleNode,
  extractWarnBoxHints,
  getGuLabel,
  getSeoulGuOptions,
  isUnrestricted,
} from './requirement-generator.helper';

const CHUNK_SIZE = 20;

const SOURCE_PRIORITY: Record<string, number> = {
  'youth-seoul': 3,
  'data-go-kr': 2,
  'youthcenter-policy': 1,
};

/** LLM이 다른 이름으로 추출할 수 있는 의미적으로 같은 키 그룹 */
const KEY_ALIASES: Record<string, string[]> = {
  employmentStatus: ['employmentStatus', 'jobStatus', 'workStatus'],
  educationRequirement: ['educationRequirement', 'educationLevel', 'education'],
};

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

  async regenerateAll(
    force = false,
  ): Promise<{ total: number; processed: number; skipped: number; failed: number }> {
    if (force) {
      await this.clearLlmArtifacts();
    } else {
      this.logger.log(
        'regenerateAll: hash-based skip mode (변경된 정책만 재생성). 전체 재생성은 ?force=true',
      );
    }

    await this.dedupeDuplicatePoliciesByTitle();

    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });

    await this.resetShortDescriptionAndPeriod(policies);

    const total = policies.length;
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = policies.slice(i, i + CHUNK_SIZE);
      for (const policy of chunk) {
        try {
          const normalized = this.buildNormalizedDocument(policy);
          const override = getPolicyManualOverride(policy.code);
          const wasSkipped = await this.generateForPolicy(policy, normalized, override, force);
          if (wasSkipped) skipped++;
          else processed++;
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to regenerate for ${policy.code}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      // 청크 처리 후 event loop 양보 → V8 GC 실행 기회 부여
      await new Promise<void>((resolve) => setImmediate(resolve));
      this.logger.log(
        `regenerateAll progress: ${Math.min(i + CHUNK_SIZE, total)}/${total}` +
          ` (processed=${processed} skipped=${skipped} failed=${failed})`,
      );
    }

    return { total, processed, skipped, failed };
  }

  /** @returns true = 해시 동일로 스킵됨, false = 정상 처리됨 */
  async generateForPolicy(
    policy: Policy,
    normalized: NormalizedPolicyDocument,
    manualOverride?: PolicyManualOverride,
    force = false,
  ): Promise<boolean> {
    const isManualOverride = await this.applyManualOverrideRule(policy, manualOverride);

    const currentHash = computePolicyContentHash(policy);
    if (!force && (await this.hasUnchangedActiveRule(policy.id, currentHash))) {
      return true;
    }

    const existingCount = await this.requirementRepository.count({
      where: { policyId: policy.id },
    });
    if (existingCount > 0) {
      await this.refreshSummaryIfNeeded(policy, normalized, manualOverride, isManualOverride);
      return false;
    }

    const requirements = this.buildBaseRequirements(policy, normalized);

    if (isManualOverride && manualOverride?.overrideRule?.root) {
      this.appendManualOverrideRequirements(requirements, manualOverride, policy.id);
    }

    const isInfoPolicy = normalized.policyType === PolicyType.INFO;
    const llmResult = isManualOverride
      ? null
      : await this.llmExtractor.extractRules(policy, normalized, isInfoPolicy);

    // override 정책도 shortDescription이 raw면 summary 전용으로 LLM 재호출
    if (isManualOverride && this.isShortDescriptionRaw(policy)) {
      const summaryResult = await this.llmExtractor.extractRules(policy, normalized, true);
      if (summaryResult?.summary) {
        policy.shortDescription = summaryResult.summary;
      }
    }

    if (!isInfoPolicy && !isManualOverride && llmResult && llmResult.conditions.length > 0) {
      this.mergeLlmConditionsIntoRequirements(requirements, llmResult, policy.id);
      await this.saveLlmRule(policy, llmResult, manualOverride, normalized, currentHash);
      this.logger.log(
        `Policy ${policy.code}: LLM extracted ${llmResult.conditions.length} conditions, ${llmResult.conditionalHints.length} hints`,
      );
    }

    this.applyLlmResultsToPolicy(policy, llmResult, manualOverride);

    if (this.hasPolicyFieldChangesFromLlm(llmResult)) {
      await this.policyRepository.save(policy);
    }

    if (requirements.length === 0) {
      return false;
    }

    await this.requirementRepository.save(
      requirements.map((r) => this.requirementRepository.create(r)),
    );
    return false;
  }

  // ---------- regenerateAll 하위 단계 ----------

  private async clearLlmArtifacts(): Promise<void> {
    const deletedReqs = await this.requirementRepository.createQueryBuilder().delete().execute();
    const deletedRules = await this.ruleRepository
      .createQueryBuilder()
      .delete()
      .where('notes = :notes', { notes: 'LLM auto-extracted' })
      .execute();
    this.logger.log(
      `[force] Cleared ${deletedReqs.affected} requirements, ${deletedRules.affected} LLM rules`,
    );
  }

  /** 같은 제목이 여러 소스에서 active인 경우 우선순위 낮은 쪽을 비활성화 */
  private async dedupeDuplicatePoliciesByTitle(): Promise<void> {
    const allActive = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });

    const byTitle = new Map<string, Policy[]>();
    for (const p of allActive) {
      const list = byTitle.get(p.title) ?? [];
      list.push(p);
      byTitle.set(p.title, list);
    }

    const getSource = (p: Policy) => {
      const meta = p.extraMeta as Record<string, unknown>;
      const pipeline = meta?.pipeline as Record<string, unknown> | undefined;
      return (pipeline?.source as string) ?? '';
    };

    let deduped = 0;
    for (const [, group] of byTitle) {
      if (group.length <= 1) continue;
      group.sort(
        (a, b) => (SOURCE_PRIORITY[getSource(b)] ?? 0) - (SOURCE_PRIORITY[getSource(a)] ?? 0),
      );
      for (let i = 1; i < group.length; i++) {
        group[i].status = PolicyStatus.INACTIVE;
        await this.policyRepository.save(group[i]);
        deduped++;
      }
    }
    if (deduped > 0) {
      this.logger.log(`Deduped ${deduped} duplicate policies`);
    }
  }

  private async resetShortDescriptionAndPeriod(policies: Policy[]): Promise<void> {
    for (const p of policies) {
      p.shortDescription = p.description?.slice(0, 120) ?? '';
      if (p.periodRaw?.trim() === '-') {
        p.periodRaw = null;
      }
    }
    await this.policyRepository.save(policies);
  }

  private buildNormalizedDocument(policy: Policy): NormalizedPolicyDocument {
    return {
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
  }

  // ---------- generateForPolicy 하위 단계 ----------

  /** manual override rule을 DB에 저장하고 기존 active rule을 비활성화. @returns override 적용 여부 */
  private async applyManualOverrideRule(
    policy: Policy,
    manualOverride?: PolicyManualOverride,
  ): Promise<boolean> {
    if (!manualOverride?.disableRule && !manualOverride?.overrideRule) {
      return false;
    }

    await this.ruleRepository.update({ policyId: policy.id, isActive: true }, { isActive: false });

    const ruleToSave: RuleDefinition = manualOverride.overrideRule ?? {
      id: `rule-${policy.code}-manual-override`,
      name: `${policy.title} 수동 override 규칙`,
      root: null,
      conditionalHints: manualOverride.conditionalHints ?? [],
    };

    await this.ruleRepository.save(
      this.ruleRepository.create({
        policyId: policy.id,
        version: 1,
        definition: ruleToSave as unknown as Record<string, unknown>,
        isActive: true,
        notes: 'manual-override',
      }),
    );
    return true;
  }

  private async hasUnchangedActiveRule(policyId: string, currentHash: string): Promise<boolean> {
    const existingRule = await this.ruleRepository.findOne({
      where: { policyId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return existingRule?.contentHash === currentHash;
  }

  /**
   * shortDescription이 LLM 요약이 아닌 "raw 상태"인지 판단.
   * LLM은 의역하므로 description의 prefix가 그대로 들어있으면 raw 발췌(정규화 fallback)로 간주.
   * 길이 단독 검사는 프롬프트 한도(200자)가 바뀌면 함께 조정해야 하므로 prefix 검사를 우선 사용.
   */
  private isShortDescriptionRaw(policy: Policy): boolean {
    if (!policy.shortDescription) return true;
    const desc = policy.description ?? '';
    const short = policy.shortDescription;
    // description의 prefix이고 충분히 긴 경우 = 정규화 단계 fallback의 raw 발췌
    if (desc && short.length >= 80 && desc.startsWith(short)) return true;
    // 250자 초과는 LLM 응답일 리 없음 (프롬프트 명세 200자 + 50자 마진)
    if (short.length > 250) return true;
    return false;
  }

  /** 이미 requirements가 있는 경우: summary·policyType·기간 정보만 LLM로 갱신 */
  private async refreshSummaryIfNeeded(
    policy: Policy,
    normalized: NormalizedPolicyDocument,
    manualOverride: PolicyManualOverride | undefined,
    isManualOverride: boolean,
  ): Promise<void> {
    if (!this.isShortDescriptionRaw(policy)) return;

    const summaryResult = await this.llmExtractor.extractRules(policy, normalized, true);
    if (!summaryResult) return;

    if (summaryResult.summary) {
      policy.shortDescription = summaryResult.summary;
    }

    // manual override의 policyType은 LLM 결과로 덮어쓰지 않음
    if (
      !isManualOverride &&
      summaryResult.policyType &&
      !this.isInfoToApplicationFlip(policy, summaryResult)
    ) {
      policy.policyType =
        summaryResult.policyType === 'info' ? PolicyType.INFO : PolicyType.APPLICATION;
    }
    if (manualOverride?.policyType) {
      policy.policyType = manualOverride.policyType;
    }

    this.applyDetectedPeriod(policy, summaryResult.detectedPeriod);

    if (summaryResult.targetDescription) {
      policy.targetDescription = summaryResult.targetDescription;
    }

    if (
      summaryResult.summary ||
      summaryResult.policyType ||
      summaryResult.detectedPeriod ||
      summaryResult.targetDescription
    ) {
      await this.policyRepository.save(policy);
    }
  }

  private buildBaseRequirements(
    policy: Policy,
    normalized: NormalizedPolicyDocument,
  ): Array<Partial<PolicyRequirement>> {
    const requirements: Array<Partial<PolicyRequirement>> = [];
    let displayOrder = 0;

    if (normalized.minAge !== null || normalized.maxAge !== null) {
      displayOrder += 1;
      requirements.push({
        policyId: policy.id,
        key: 'age',
        label: '나이',
        description: buildAgeDescription(normalized.minAge, normalized.maxAge),
        type: QuestionType.NUMBER,
        options: null,
        isRequired: false,
        displayOrder,
      });
    }

    // 구 단위 정책은 구 선택 requirement 생성 / 서울 전체 정책은 profile.regionCode로 자동 처리
    const hasGuRegion = policy.regionCodes.some((r) => r.startsWith('seoul_'));
    if (hasGuRegion) {
      displayOrder += 1;
      requirements.push({
        policyId: policy.id,
        key: 'regionCode',
        label: '거주 지역',
        description: `${getGuLabel(policy.regionCodes)} 거주자 대상 정책입니다.`,
        type: QuestionType.SELECT,
        options: getSeoulGuOptions(),
        isRequired: false,
        displayOrder,
      });
    }

    displayOrder = this.appendMetaBasedRequirement(requirements, policy.id, displayOrder, {
      key: 'employmentStatus',
      label: '취업 상태',
      value: normalized.extraMeta?.employmentStatus,
      maxLength: 160,
      type: QuestionType.SELECT,
      options: ['미취업', '재학', '취준', '재직', '자영업', '기타'],
    });
    displayOrder = this.appendMetaBasedRequirement(requirements, policy.id, displayOrder, {
      key: 'educationRequirement',
      label: '학력',
      value: normalized.extraMeta?.educationReq,
      maxLength: 160,
      type: QuestionType.SELECT,
      options: ['고졸 이하', '대학 재학', '대졸', '석사 이상', '무관'],
    });
    this.appendMetaBasedRequirement(requirements, policy.id, displayOrder, {
      key: 'selectionCriteria',
      label: '선정기준',
      value: normalized.extraMeta?.selectionCriteria,
      maxLength: 500,
      type: QuestionType.STRING,
      options: null,
    });

    return requirements;
  }

  private appendMetaBasedRequirement(
    requirements: Array<Partial<PolicyRequirement>>,
    policyId: string,
    displayOrder: number,
    spec: {
      key: string;
      label: string;
      value: unknown;
      maxLength: number;
      type: QuestionType;
      options: string[] | null;
    },
  ): number {
    if (typeof spec.value !== 'string' || !spec.value.trim() || isUnrestricted(spec.value)) {
      return displayOrder;
    }
    const nextOrder = displayOrder + 1;
    requirements.push({
      policyId,
      key: spec.key,
      label: spec.label,
      description: spec.value.slice(0, spec.maxLength),
      type: spec.type,
      options: spec.options,
      isRequired: false,
      displayOrder: nextOrder,
    });
    return nextOrder;
  }

  private appendManualOverrideRequirements(
    requirements: Array<Partial<PolicyRequirement>>,
    manualOverride: PolicyManualOverride,
    policyId: string,
  ): void {
    const overrideReqs = extractRequirementsFromRuleNode(
      manualOverride.overrideRule!.root as Record<string, unknown>,
      policyId,
    );
    const existingKeys = new Set(requirements.map((r) => r.key));
    let displayOrder = requirements.length;

    for (const req of overrideReqs) {
      if (existingKeys.has(req.key)) continue;
      displayOrder += 1;
      requirements.push({ ...req, displayOrder });
      existingKeys.add(req.key!);
    }
  }

  private mergeLlmConditionsIntoRequirements(
    requirements: Array<Partial<PolicyRequirement>>,
    llmResult: LlmExtractionResult,
    policyId: string,
  ): void {
    const resolveKeyGroup = (key: string): string => {
      for (const [group, aliases] of Object.entries(KEY_ALIASES)) {
        if (aliases.includes(key)) return group;
      }
      return key;
    };

    const existingKeyGroups = new Set(requirements.map((r) => resolveKeyGroup(r.key!)));
    let displayOrder = requirements.length;

    for (const condition of llmResult.conditions) {
      const group = resolveKeyGroup(condition.key);

      if (existingKeyGroups.has(group)) {
        // LLM이 더 정확한 options/value를 가지므로 기존 규칙 기반 것을 교체
        const existingIdx = requirements.findIndex((r) => resolveKeyGroup(r.key!) === group);
        if (existingIdx >= 0) {
          requirements[existingIdx] = {
            ...requirements[existingIdx],
            key: condition.key,
            label: condition.label,
            description: condition.message || condition.label,
            type: condition.type,
            options: condition.options,
            isRequired: true,
          };
        }
        continue;
      }
      existingKeyGroups.add(group);

      displayOrder += 1;
      requirements.push({
        policyId,
        key: condition.key,
        label: condition.label,
        description: condition.message || condition.label,
        type: condition.type,
        options: condition.options,
        isRequired: true,
        displayOrder,
      });
    }
  }

  private async saveLlmRule(
    policy: Policy,
    llmResult: LlmExtractionResult,
    manualOverride: PolicyManualOverride | undefined,
    normalized: NormalizedPolicyDocument,
    currentHash: string,
  ): Promise<void> {
    const ruleDefinition: RuleDefinition = {
      id: `rule-${policy.code}-llm-v1`,
      name: `${policy.title} LLM 추출 규칙`,
      root: llmResult.root ?? {
        all: llmResult.conditions.map((c) => ({
          fact: c.fact,
          op: c.op,
          value: c.value,
          message: c.message,
          verifiable: c.verifiable,
        })),
      },
      conditionalHints: [
        ...llmResult.conditionalHints,
        ...extractWarnBoxHints(normalized.extraMeta),
        ...extractCapacityHints(normalized.description),
        ...extractFirstComeHints(normalized.extraMeta),
        ...(manualOverride?.appendConditionalHints ?? []),
      ],
    };

    await this.ruleRepository.save(
      this.ruleRepository.create({
        policyId: policy.id,
        version: 1,
        definition: ruleDefinition,
        isActive: true,
        notes: 'LLM auto-extracted',
        contentHash: currentHash,
      }),
    );
  }

  private applyLlmResultsToPolicy(
    policy: Policy,
    llmResult: LlmExtractionResult | null,
    manualOverride: PolicyManualOverride | undefined,
  ): void {
    // 수집기가 나이를 못 가져온 경우 LLM이 감지한 값으로 보완
    if (llmResult?.detectedAge && policy.minAge === null && policy.maxAge === null) {
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

    // manual override의 policyType이 있으면 강제 고정, 없으면 LLM 결과로 갱신 (단, INFO→APPLICATION 플립 금지)
    if (manualOverride?.policyType) {
      policy.policyType = manualOverride.policyType;
    } else if (llmResult?.policyType && !this.isInfoToApplicationFlip(policy, llmResult)) {
      policy.policyType =
        llmResult.policyType === 'info' ? PolicyType.INFO : PolicyType.APPLICATION;
    }

    this.applyDetectedPeriod(policy, llmResult?.detectedPeriod ?? null);

    if (llmResult?.targetDescription) {
      policy.targetDescription = llmResult.targetDescription;
    }
  }

  /** 규칙 기반 INFO가 LLM 비결정성으로 APPLICATION으로 뒤집히는 것을 방지 */
  private isInfoToApplicationFlip(
    policy: Policy,
    result: { policyType: 'application' | 'info' | null },
  ): boolean {
    return policy.policyType === PolicyType.INFO && result.policyType === 'application';
  }

  private applyDetectedPeriod(policy: Policy, detectedPeriod: string | null | undefined): void {
    const hasPeriod = policy.isAlwaysOpen || policy.startsAt || policy.endsAt;
    const rawEmpty = !policy.periodRaw || policy.periodRaw.trim() === '-';

    if (detectedPeriod && (!hasPeriod || rawEmpty)) {
      if (detectedPeriod === 'always') {
        policy.isAlwaysOpen = true;
        policy.periodRaw = null;
      } else {
        policy.periodRaw = detectedPeriod;
      }
    }

    // 복지로는 단발성 공모가 아닌 상시 운영 복지서비스 포털 — 규칙/LLM 모두 단서 없으면 상시로 가정
    const originalSource = (policy.extraMeta?.originalSource as string | undefined) ?? '';
    if (
      !policy.isAlwaysOpen &&
      !policy.startsAt &&
      !policy.endsAt &&
      rawEmpty &&
      originalSource.startsWith('bokjiro-')
    ) {
      policy.isAlwaysOpen = true;
      policy.periodRaw = null;
    }

    if (policy.isAlwaysOpen && policy.periodRaw?.trim() === '-') {
      policy.periodRaw = null;
    }
  }

  private hasPolicyFieldChangesFromLlm(llmResult: LlmExtractionResult | null): boolean {
    if (!llmResult) return false;
    return Boolean(
      llmResult.summary ||
      llmResult.detectedAge ||
      llmResult.policyType ||
      llmResult.detectedPeriod ||
      llmResult.targetDescription,
    );
  }
}
