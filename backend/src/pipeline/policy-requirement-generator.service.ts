import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionType } from '../common/enums/question-type.enum';
import { PolicyType } from '../common/enums/policy-type.enum';
import { PolicyStatus } from '../common/enums/policy-status.enum';
import { RuleDefinition } from '../common/interfaces/rule-expression.interface';
import { RegionCode, SEOUL_GU_MAP } from '../common/enums/region-code.enum';
import { Policy, PolicyRequirement, PolicyRule } from '../database/entities';
import { NormalizedPolicyDocument } from './interfaces/normalized-policy.interface';
import { LlmRuleExtractorService } from './llm-rule-extractor.service';
import { getPolicyManualOverride, PolicyManualOverride } from '../common/constants/policy-manual-overrides.constant';

const GU_CODE_TO_NAME = Object.fromEntries(
  Object.entries(SEOUL_GU_MAP).map(([name, code]) => [code, name]),
);

/** 정책 콘텐츠 해시 — LLM 입력이 되는 필드만 포함 */
function computePolicyContentHash(policy: Policy): string {
  const extra = (policy.extraMeta ?? {}) as Record<string, unknown>;
  const content = [
    policy.title,
    policy.description,
    policy.policyType,
    policy.regionCodes.join(','),
    String(extra.selectionCriteria ?? ''),
    String(extra.supportContent ?? ''),
    String(extra.warnBox ?? ''),
    String(extra.targetInfo ?? ''),
    String(extra.employmentStatus ?? ''),
  ].join('\x00');
  return createHash('md5').update(content).digest('hex');
}

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

  async regenerateAll(force = false): Promise<{ total: number; processed: number; skipped: number; failed: number }> {
    if (force) {
      // force 모드: 기존 requirements + LLM rules 전부 삭제 후 재생성
      const deletedReqs = await this.requirementRepository.createQueryBuilder()
        .delete().execute();
      const deletedRules = await this.ruleRepository.createQueryBuilder()
        .delete().where('notes = :notes', { notes: 'LLM auto-extracted' }).execute();
      this.logger.log(
        `[force] Cleared ${deletedReqs.affected} requirements, ${deletedRules.affected} LLM rules`,
      );
    } else {
      this.logger.log('regenerateAll: hash-based skip mode (변경된 정책만 재생성). 전체 재생성은 ?force=true');
    }

    // 2. 중복 정책 정리 (같은 제목이 여러 소스에서 active인 경우, 우선순위 낮은 쪽 비활성화)
    const allActive = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });
    const priority: Record<string, number> = { 'youth-seoul': 3, 'data-go-kr': 2, 'youthcenter-policy': 1 };
    const byTitle = new Map<string, typeof allActive>();
    for (const p of allActive) {
      const list = byTitle.get(p.title) ?? [];
      list.push(p);
      byTitle.set(p.title, list);
    }
    let deduped = 0;
    for (const [, group] of byTitle) {
      if (group.length <= 1) continue;
      const getSource = (p: Policy) => {
        const meta = p.extraMeta as Record<string, unknown>;
        const pipeline = meta?.pipeline as Record<string, unknown> | undefined;
        return (pipeline?.source as string) ?? '';
      };
      group.sort((a, b) => (priority[getSource(b)] ?? 0) - (priority[getSource(a)] ?? 0));
      // 첫 번째(우선순위 최고)만 유지, 나머지 비활성화
      for (let i = 1; i < group.length; i++) {
        group[i].status = PolicyStatus.INACTIVE;
        await this.policyRepository.save(group[i]);
        deduped++;
      }
    }
    if (deduped > 0) {
      this.logger.log(`Deduped ${deduped} duplicate policies`);
    }

    // 3. 모든 활성 정책에 대해 재생성
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

    const total = policies.length;
    let processed = 0;
    let skipped = 0;
    let failed = 0;
    const CHUNK_SIZE = 20;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = policies.slice(i, i + CHUNK_SIZE);
      for (const policy of chunk) {
        try {
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

          const override = getPolicyManualOverride(policy.code);
          const wasSkipped = await this.generateForPolicy(policy, normalized, override, force);
          if (wasSkipped) skipped++; else processed++;
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

  /**
   * @returns true = 해시 동일로 스킵됨, false = 정상 처리됨
   */
  async generateForPolicy(
    policy: Policy,
    normalized: NormalizedPolicyDocument,
    manualOverride?: PolicyManualOverride,
    force = false,
  ): Promise<boolean> {
    // manual override: disableRule 또는 overrideRule이면 기존 rule 비활성화 후 저장
    if (manualOverride?.disableRule || manualOverride?.overrideRule) {
      await this.ruleRepository.update(
        { policyId: policy.id, isActive: true },
        { isActive: false },
      );
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
      return false;
    }

    // 해시 기반 스킵: force=false이면 콘텐츠가 변경되지 않은 정책은 LLM 재호출 안 함
    const currentHash = computePolicyContentHash(policy);
    if (!force) {
      const existingRule = await this.ruleRepository.findOne({
        where: { policyId: policy.id, isActive: true },
        order: { createdAt: 'DESC' },
      });
      if (existingRule?.contentHash === currentHash) {
        return true; // 변경 없음, 스킵
      }
    }

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
        // 규칙 기반 INFO는 LLM이 APPLICATION으로 뒤집지 못하게 함 (LLM 비결정성 방지)
        if (summaryResult?.policyType && !(policy.policyType === PolicyType.INFO && summaryResult.policyType === 'application')) {
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
        if (summaryResult?.targetDescription) {
          policy.targetDescription = summaryResult.targetDescription;
        }
        if (summaryResult?.summary || summaryResult?.policyType || summaryResult?.detectedPeriod || summaryResult?.targetDescription) {
          await this.policyRepository.save(policy);
        }
      }
      return false;
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

    // 지역 requirement: 구 단위는 구 선택, 서울 전체는 서울 거주 여부
    const hasGuRegion = policy.regionCodes.some((r) => r.startsWith('seoul_'));
    const hasSeoulRegion = policy.regionCodes.includes(RegionCode.SEOUL);
    if (hasGuRegion) {
      displayOrder += 1;
      const guLabel = this.getGuLabel(policy.regionCodes);
      requirements.push({
        policyId: policy.id,
        key: 'regionCode',
        label: '거주 지역',
        description: `${guLabel} 거주자 대상 정책입니다.`,
        type: QuestionType.SELECT,
        options: this.getSeoulGuOptions(),
        isRequired: false,
        displayOrder,
      });
    }
    // 서울 전체 정책(hasSeoulRegion)은 profile.regionCode로 자동 처리 — 질문 불필요

    const employmentStatus = normalized.extraMeta?.employmentStatus;
    if (typeof employmentStatus === 'string' && employmentStatus.trim() && !this.isUnrestricted(employmentStatus)) {
      displayOrder += 1;
      requirements.push({
        policyId: policy.id,
        key: 'employmentStatus',
        label: '취업 상태',
        description: employmentStatus.slice(0, 160),
        type: QuestionType.SELECT,
        options: ['미취업', '재학', '취준', '재직', '자영업', '기타'],
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
      // 의미적으로 같은 키 그룹 (LLM이 다른 이름으로 추출할 수 있음)
      const KEY_ALIASES: Record<string, string[]> = {
        employmentStatus: ['employmentStatus', 'jobStatus', 'workStatus'],
        educationRequirement: ['educationRequirement', 'educationLevel', 'education'],
      };
      const resolveKeyGroup = (key: string): string => {
        for (const [group, aliases] of Object.entries(KEY_ALIASES)) {
          if (aliases.includes(key)) return group;
        }
        return key;
      };

      const existingKeyGroups = new Set(requirements.map((r) => resolveKeyGroup(r.key!)));

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
        // LLM이 중첩 트리를 제공한 경우 그대로 사용, 아니면 flat conditions로 구성
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
          ...this.extractWarnBoxHints(normalized.extraMeta),
          ...this.extractCapacityHints(normalized.description),
          ...this.extractFirstComeHints(normalized.extraMeta),
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

    // 규칙 기반 INFO는 LLM이 APPLICATION으로 뒤집지 못하게 함 (LLM 비결정성 방지)
    if (llmResult?.policyType && !(policy.policyType === PolicyType.INFO && llmResult.policyType === 'application')) {
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

    if (llmResult?.targetDescription) {
      policy.targetDescription = llmResult.targetDescription;
    }

    // 변경된 필드가 있으면 한 번만 저장
    if (llmResult?.summary || llmResult?.detectedAge || llmResult?.policyType || llmResult?.detectedPeriod || llmResult?.targetDescription) {
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

  private isUnrestricted(value: string): boolean {
    const normalized = value.trim().replace(/^[-·\s]+/, '').replace(/\s+/g, '');
    const patterns = ['제한없음', '무관', '제한없는', '-', '해당없음', ''];
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

  private getGuLabel(regionCodes: RegionCode[]): string {
    return regionCodes
      .filter((r) => r.startsWith('seoul_'))
      .map((r) => GU_CODE_TO_NAME[r] ?? r)
      .join(', ');
  }

  private getSeoulGuOptions(): string[] {
    return Object.keys(SEOUL_GU_MAP);
  }

  private extractWarnBoxHints(extraMeta: Record<string, unknown>): string[] {
    const warnBox = extraMeta?.warnBox;
    if (typeof warnBox !== 'string' || !warnBox.trim()) return [];
    return [warnBox.trim()];
  }

  private extractFirstComeHints(extraMeta: Record<string, unknown>): string[] {
    const hints: string[] = [];
    if (extraMeta?.isFirstComeFirstServed === true) {
      hints.push('선착순 접수 정책입니다. 모집 마감 여부를 공식 공고문에서 확인하세요.');
    }
    const bizPeriodEtc = extraMeta?.bizPeriodEtc;
    if (typeof bizPeriodEtc === 'string' && bizPeriodEtc.trim() && /소진|마감|종료/.test(bizPeriodEtc)) {
      hints.push(`${bizPeriodEtc.trim()} 조기 종료될 수 있습니다.`);
    }
    return hints;
  }

  private extractCapacityHints(description: string): string[] {
    if (!description) return [];
    // "선착순 N명", "N명 모집", "총 N명", "지원규모: N명", "약 N여명" 등 인원 제한 패턴 감지
    const patterns = [
      /선착순\s*[\d,]+\s*명/,
      /[\d,]+\s*명\s*(?:모집|선발|선정|내외|이내)/,
      /총\s*[\d,]+\s*명/,
      /지원\s*규모\s*[:\s]\s*[\d,]+\s*명/,
      /약\s*[\d,]+\s*여?\s*명/,
    ];
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        return [`선착순/인원 제한이 있는 정책입니다 (${match[0].trim()}). 모집 마감 여부를 공식 공고문에서 확인하세요.`];
      }
    }
    return [];
  }
}
