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

    if (this.isExpired(normalized.endsAt)) {
      const expiredRun = await this.runRepository.save(
        this.runRepository.create({
          rawDocumentId: rawDoc.id,
          policyId: null,
          normalized: this.toJsonRecord(normalized),
          validation: this.toJsonRecord(validation),
          persisted: false,
          action: 'skipped',
          message: `마감된 정책: ${normalized.endsAt}`,
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

    const nextPolicy = this.policyRepository.create({
      id: existing?.id,
      code: normalized.code,
      title: normalized.title,
      shortDescription: normalized.shortDescription,
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
}
