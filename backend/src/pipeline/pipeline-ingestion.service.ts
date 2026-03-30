import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { evaluateMvpScope } from '../common/constants/mvp-policy-scope.constant';
import { InterestCategory } from '../common/enums/interest-category.enum';
import { PolicyStatus } from '../common/enums/policy-status.enum';
import { RegionCode } from '../common/enums/region-code.enum';
import {
  PipelineIngestionRun,
  Policy,
  RawPolicyDocumentEntity,
} from '../database/entities';
import { RawPolicyDocument } from './interfaces/raw-policy.interface';
import { PolicyNormalizationService } from './policy-normalization.service';
import { PolicyRequirementGeneratorService } from './policy-requirement-generator.service';
import { PolicyValidationService } from './policy-validation.service';

export interface IngestOneResult {
  rawDocumentId: string;
  runId: string;
  persisted: boolean;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  message: string | null;
  policy: {
    id: string;
    code: string;
    title: string;
  } | null;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  normalizationMeta: {
    confidence: number;
    usedLlmFallback: boolean;
  };
}

export interface IngestBatchResult {
  total: number;
  persisted: number;
  failed: number;
  skipped: number;
  items: IngestOneResult[];
}

@Injectable()
export class PipelineIngestionService {
  constructor(
    @InjectRepository(RawPolicyDocumentEntity)
    private readonly rawRepository: Repository<RawPolicyDocumentEntity>,
    @InjectRepository(PipelineIngestionRun)
    private readonly runRepository: Repository<PipelineIngestionRun>,
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
    private readonly normalizationService: PolicyNormalizationService,
    private readonly validationService: PolicyValidationService,
    private readonly requirementGenerator: PolicyRequirementGeneratorService,
  ) {}

  async ingestOne(raw: RawPolicyDocument): Promise<IngestOneResult> {
    const rawDoc = await this.rawRepository.save(
      this.rawRepository.create({
        source: raw.source,
        sourceUrl: raw.sourceUrl ?? null,
        title: raw.title,
        body: raw.body,
        fetchedAt: new Date(raw.fetchedAt),
        metadata: raw.metadata ?? {},
      }),
    );

    const normalizedResult = this.normalizationService.normalize(raw);
    const validation = this.validationService.validate(normalizedResult.normalized);

    if (!validation.isValid) {
      const failedRun = await this.runRepository.save(
        this.runRepository.create({
          rawDocumentId: rawDoc.id,
          policyId: null,
          normalized: this.toJsonRecord(normalizedResult.normalized),
          validation: this.toJsonRecord(validation),
          persisted: false,
          action: 'failed',
          message: `검증 실패: ${validation.errors.join('; ')}`,
        }),
      );

      return {
        rawDocumentId: rawDoc.id,
        runId: failedRun.id,
        persisted: false,
        action: 'failed',
        message: failedRun.message,
        policy: null,
        validation,
        normalizationMeta: {
          confidence: normalizedResult.confidence,
          usedLlmFallback: normalizedResult.usedLlmFallback,
        },
      };
    }

    const normalized = normalizedResult.normalized;

    // 제목에 전전년도 이하 연도가 포함된 정책은 필터링
    if (this.hasPastYearInTitle(normalized.title)) {
      const deactivatedPolicyId = await this.deactivateExistingOutOfScopePolicy(normalized.code);
      const msg = deactivatedPolicyId
        ? `제목에 과거 연도 포함 (기존 정책 ${deactivatedPolicyId} 비활성화)`
        : '제목에 과거 연도 포함';

      const skippedRun = await this.runRepository.save(
        this.runRepository.create({
          rawDocumentId: rawDoc.id,
          policyId: null,
          normalized: this.toJsonRecord(normalized),
          validation: this.toJsonRecord(validation),
          persisted: false,
          action: 'skipped',
          message: msg,
        }),
      );

      return {
        rawDocumentId: rawDoc.id,
        runId: skippedRun.id,
        persisted: false,
        action: 'skipped',
        message: msg,
        policy: null,
        validation,
        normalizationMeta: {
          confidence: normalizedResult.confidence,
          usedLlmFallback: normalizedResult.usedLlmFallback,
        },
      };
    }

    if (this.isExpired(normalized.endsAt)) {
      const deactivatedPolicyId = await this.deactivateExistingExpiredPolicy(
        normalized.code,
        normalized.endsAt!,
      );
      const expiredMessage = deactivatedPolicyId
        ? `마감된 정책: ${normalized.endsAt} (기존 정책 ${deactivatedPolicyId} 비활성화)`
        : `마감된 정책: ${normalized.endsAt}`;

      const expiredRun = await this.runRepository.save(
        this.runRepository.create({
          rawDocumentId: rawDoc.id,
          policyId: null,
          normalized: this.toJsonRecord(normalized),
          validation: this.toJsonRecord(validation),
          persisted: false,
          action: 'skipped',
          message: expiredMessage,
        }),
      );

      return {
        rawDocumentId: rawDoc.id,
        runId: expiredRun.id,
        persisted: false,
        action: 'skipped',
        message: expiredRun.message,
        policy: null,
        validation,
        normalizationMeta: {
          confidence: normalizedResult.confidence,
          usedLlmFallback: normalizedResult.usedLlmFallback,
        },
      };
    }

    // 제목에 과거 연도(전년도 제외)가 포함되면 오래된 정책으로 판단하여 제외
    const outdatedYear = this.detectOutdatedYear(normalized.title);
    if (outdatedYear) {
      const outdatedRun = await this.runRepository.save(
        this.runRepository.create({
          rawDocumentId: rawDoc.id,
          policyId: null,
          normalized: this.toJsonRecord(normalized),
          validation: this.toJsonRecord(validation),
          persisted: false,
          action: 'skipped',
          message: `제목에 과거 연도(${outdatedYear}) 포함 — 오래된 정책으로 판단`,
        }),
      );

      return {
        rawDocumentId: rawDoc.id,
        runId: outdatedRun.id,
        persisted: false,
        action: 'skipped',
        message: outdatedRun.message,
        policy: null,
        validation,
        normalizationMeta: {
          confidence: normalizedResult.confidence,
          usedLlmFallback: normalizedResult.usedLlmFallback,
        },
      };
    }

    const scope = this.evaluateMvpScope(raw.source, normalized.categories, normalized.regionCodes);
    if (!scope.isInScope) {
      const deactivatedPolicyId = await this.deactivateExistingOutOfScopePolicy(
        normalized.code,
      );
      const skippedMessage = deactivatedPolicyId
        ? `${scope.reason} 기존 정책(${deactivatedPolicyId})을 비활성화했습니다.`
        : scope.reason;

      const skippedRun = await this.runRepository.save(
        this.runRepository.create({
          rawDocumentId: rawDoc.id,
          policyId: null,
          normalized: this.toJsonRecord(normalized),
          validation: this.toJsonRecord(validation),
          persisted: false,
          action: 'skipped',
          message: skippedMessage,
        }),
      );

      return {
        rawDocumentId: rawDoc.id,
        runId: skippedRun.id,
        persisted: false,
        action: 'skipped',
        message: skippedRun.message,
        policy: null,
        validation,
        normalizationMeta: {
          confidence: normalizedResult.confidence,
          usedLlmFallback: normalizedResult.usedLlmFallback,
        },
      };
    }

    const existing = await this.policyRepository.findOne({
      where: { code: normalized.code },
    });

    // 같은 제목의 정책이 다른 소스에서 이미 수집된 경우, 우선순위 높은 쪽만 유지
    const duplicateByTitle = await this.policyRepository.findOne({
      where: { title: normalized.title, status: PolicyStatus.ACTIVE },
    });
    if (duplicateByTitle && duplicateByTitle.code !== normalized.code) {
      const existingSource = (duplicateByTitle.extraMeta as Record<string, unknown>)?.pipeline
        ? ((duplicateByTitle.extraMeta as Record<string, unknown>).pipeline as Record<string, unknown>).source as string
        : '';
      const currentSource = raw.source;
      // 소스 우선순위: youth-seoul > data-go-kr > youthcenter-policy (크롤링 데이터가 가장 풍부)
      const priority: Record<string, number> = { 'youth-seoul': 3, 'data-go-kr': 2, 'youthcenter-policy': 1 };
      const existingPriority = priority[existingSource] ?? 0;
      const currentPriority = priority[currentSource] ?? 0;

      if (existingPriority >= currentPriority) {
        // 기존 정책이 우선순위 높거나 같으면 현재 건 스킵 + 자신도 비활성화
        if (existing) {
          existing.status = PolicyStatus.INACTIVE;
          await this.policyRepository.save(existing);
        }
        const skipRun = await this.runRepository.save(
          this.runRepository.create({
            rawDocumentId: rawDoc.id,
            policyId: null,
            normalized: this.toJsonRecord(normalized),
            validation: this.toJsonRecord(validation),
            persisted: false,
            action: 'skipped',
            message: `중복 정책: "${normalized.title}" (${existingSource} 우선)`,
          }),
        );
        return {
          rawDocumentId: rawDoc.id,
          runId: skipRun.id,
          persisted: false,
          action: 'skipped',
          message: `중복 정책: "${normalized.title}" (${existingSource} 우선)`,
          policy: null,
          validation,
          normalizationMeta: {
            confidence: normalizedResult.confidence,
            usedLlmFallback: normalizedResult.usedLlmFallback,
          },
        };
      } else {
        // 현재 소스가 우선순위 높으면 기존 건 비활성화
        duplicateByTitle.status = PolicyStatus.INACTIVE;
        await this.policyRepository.save(duplicateByTitle);
      }
    }

    const nextPolicy = this.policyRepository.create({
      id: existing?.id,
      code: normalized.code,
      title: normalized.title,
      shortDescription: (existing?.shortDescription && existing.shortDescription !== existing.description?.slice(0, 120))
        ? existing.shortDescription
        : normalized.shortDescription,
      description: normalized.description,
      providerName: normalized.providerName,
      sourceUrl: normalized.sourceUrl,
      applicationUrl: normalized.applicationUrl,
      applicationMethod: normalized.applicationMethod,
      status: PolicyStatus.ACTIVE,
      categories: normalized.categories,
      regionCodes: normalized.regionCodes,
      targetGenders: existing?.targetGenders ?? [],
      minAge: normalized.minAge,
      maxAge: normalized.maxAge,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
      isAlwaysOpen: normalized.isAlwaysOpen,
      periodRaw: normalized.periodRaw,
      policyType: normalized.policyType,
      extraMeta: {
        ...(existing?.extraMeta ?? {}),
        ...(normalized.extraMeta ?? {}),
        pipeline: {
          lastIngestedAt: new Date().toISOString(),
          source: raw.source,
        },
      },
    });

    const savedPolicy = await this.policyRepository.save(nextPolicy);
    const action: 'created' | 'updated' = existing ? 'updated' : 'created';

    await this.requirementGenerator.generateForPolicy(savedPolicy, normalized);

    const run = await this.runRepository.save(
      this.runRepository.create({
        rawDocumentId: rawDoc.id,
        policyId: savedPolicy.id,
        normalized: this.toJsonRecord(normalized),
        validation: this.toJsonRecord(validation),
        persisted: true,
        action,
        message: null,
      }),
    );

    return {
      rawDocumentId: rawDoc.id,
      runId: run.id,
      persisted: true,
      action,
      message: null,
      policy: {
        id: savedPolicy.id,
        code: savedPolicy.code,
        title: savedPolicy.title,
      },
      validation,
      normalizationMeta: {
        confidence: normalizedResult.confidence,
        usedLlmFallback: normalizedResult.usedLlmFallback,
      },
    };
  }

  async ingestBatch(rawDocuments: RawPolicyDocument[]): Promise<IngestBatchResult> {
    const results: IngestOneResult[] = [];

    for (const raw of rawDocuments) {
      const result = await this.ingestOne(raw);
      results.push(result);
    }

    return {
      total: results.length,
      persisted: results.filter((item) => item.persisted).length,
      failed: results.filter((item) => item.action === 'failed').length,
      skipped: results.filter((item) => item.action === 'skipped').length,
      items: results,
    };
  }

  async deactivateExpiredPolicies(): Promise<{ deactivated: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const active = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
    });

    let deactivated = 0;
    for (const policy of active) {
      if (this.isExpired(policy.endsAt)) {
        policy.status = PolicyStatus.INACTIVE;
        await this.policyRepository.save(policy);
        deactivated++;
      }
    }

    return { deactivated };
  }

  private detectOutdatedYear(title: string): number | null {
    const currentYear = new Date().getFullYear();
    const minAllowedYear = currentYear - 1; // 전년도까지 허용
    const yearMatches = title.match(/\b(20\d{2})\b/g);
    if (!yearMatches) return null;

    for (const match of yearMatches) {
      const year = parseInt(match, 10);
      if (year < minAllowedYear) return year;
    }
    return null;
  }

  private hasPastYearInTitle(title: string): boolean {
    const currentYear = new Date().getFullYear();
    const yearMatches = title.match(/\b(20\d{2})\b/g);
    if (!yearMatches) return false;
    // 제목에 있는 모든 연도가 전년도 이하면 필터링 (현재년도만 허용)
    return yearMatches.every((y) => parseInt(y, 10) < currentYear);
  }

  private isExpired(endsAt: string | null): boolean {
    if (!endsAt) return false;
    const endDate = new Date(endsAt);
    if (isNaN(endDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  private toJsonRecord(input: unknown): Record<string, unknown> {
    return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  }

  private evaluateMvpScope(
    source: string,
    categories: InterestCategory[],
    regionCodes: RegionCode[],
  ): { isInScope: boolean; reason: string } {
    const result = evaluateMvpScope(source, categories, regionCodes);
    return { isInScope: result.inScope, reason: result.reason };
  }

  private async deactivateExistingOutOfScopePolicy(
    code: string,
  ): Promise<string | null> {
    const existing = await this.policyRepository.findOne({
      where: { code, status: PolicyStatus.ACTIVE },
    });
    if (!existing) {
      return null;
    }

    existing.status = PolicyStatus.INACTIVE;
    existing.extraMeta = {
      ...(existing.extraMeta ?? {}),
      pipeline: {
        ...((existing.extraMeta?.pipeline as Record<string, unknown>) ?? {}),
        mvpOutOfScopeAt: new Date().toISOString(),
      },
    };
    const saved = await this.policyRepository.save(existing);
    return saved.id;
  }

  private async deactivateExistingExpiredPolicy(
    code: string,
    endsAt: string,
  ): Promise<string | null> {
    const existing = await this.policyRepository.findOne({
      where: { code, status: PolicyStatus.ACTIVE },
    });
    if (!existing) {
      return null;
    }

    existing.status = PolicyStatus.INACTIVE;
    existing.extraMeta = {
      ...(existing.extraMeta ?? {}),
      pipeline: {
        ...((existing.extraMeta?.pipeline as Record<string, unknown>) ?? {}),
        expiredAt: endsAt,
        deactivatedAt: new Date().toISOString(),
      },
    };
    const saved = await this.policyRepository.save(existing);
    return saved.id;
  }
}
