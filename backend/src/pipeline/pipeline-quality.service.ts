import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  evaluateMvpScope,
  getPolicySource,
} from '../common/constants/mvp-policy-scope.constant';
import { PolicyStatus } from '../common/enums/policy-status.enum';
import { Policy } from '../database/entities';

export interface SourceQualitySummary {
  source: string;
  total: number;
  inMvpScope: number;
  outOfMvpScope: number;
  missingApplicationUrl: number;
  missingApplicationMethod: number;
  missingBoth: number;
}

export interface PipelineQualityOutOfScopeSample {
  id: string;
  title: string;
  source: string;
  providerName: string;
  categories: string[];
  regionCodes: string[];
  reason: string;
}

export interface PipelineQualityReport {
  generatedAt: string;
  totals: {
    total: number;
    inMvpScope: number;
    outOfMvpScope: number;
    missingApplicationUrl: number;
    missingApplicationMethod: number;
    missingBoth: number;
    mvpCoverageRate: number;
  };
  bySource: SourceQualitySummary[];
  outOfScopeSamples: PipelineQualityOutOfScopeSample[];
}

export interface PipelinePruneReport {
  prunedAt: string;
  totalActiveBefore: number;
  deactivatedCount: number;
  deactivatedByReason: Record<string, number>;
  sample: Array<{
    id: string;
    code: string;
    title: string;
    source: string;
    reason: string;
  }>;
}

@Injectable()
export class PipelineQualityService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
  ) {}

  async getQualityReport(): Promise<PipelineQualityReport> {
    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    const bySourceMap = new Map<string, SourceQualitySummary>();
    const outOfScopeSamples: PipelineQualityOutOfScopeSample[] = [];

    let inMvpScope = 0;
    let outOfMvpScope = 0;
    let missingApplicationUrl = 0;
    let missingApplicationMethod = 0;
    let missingBoth = 0;

    for (const policy of policies) {
      const source = this.getPolicySource(policy);
      const sourceSummary = this.getOrCreateSourceSummary(bySourceMap, source);

      sourceSummary.total += 1;

      const scope = this.evaluateMvpScopeForPolicy(policy, source);
      if (scope.inScope) {
        inMvpScope += 1;
        sourceSummary.inMvpScope += 1;
      } else {
        outOfMvpScope += 1;
        sourceSummary.outOfMvpScope += 1;

        if (outOfScopeSamples.length < 20) {
          outOfScopeSamples.push({
            id: policy.id,
            title: policy.title,
            source,
            providerName: policy.providerName,
            categories: policy.categories,
            regionCodes: policy.regionCodes,
            reason: scope.reason,
          });
        }
      }

      const urlEmpty = !policy.applicationUrl;
      const methodEmpty = !policy.applicationMethod;

      if (urlEmpty) {
        missingApplicationUrl += 1;
        sourceSummary.missingApplicationUrl += 1;
      }
      if (methodEmpty) {
        missingApplicationMethod += 1;
        sourceSummary.missingApplicationMethod += 1;
      }
      if (urlEmpty && methodEmpty) {
        missingBoth += 1;
        sourceSummary.missingBoth += 1;
      }
    }

    const total = policies.length;

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        total,
        inMvpScope,
        outOfMvpScope,
        missingApplicationUrl,
        missingApplicationMethod,
        missingBoth,
        mvpCoverageRate: total > 0 ? Number((inMvpScope / total).toFixed(4)) : 0,
      },
      bySource: Array.from(bySourceMap.values()).sort((a, b) =>
        a.source.localeCompare(b.source),
      ),
      outOfScopeSamples,
    };
  }

  async pruneOutOfMvpActivePolicies(): Promise<PipelinePruneReport> {
    const policies = await this.policyRepository.find({
      where: { status: PolicyStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });

    const deactivatedByReason: Record<string, number> = {};
    const sample: PipelinePruneReport['sample'] = [];
    let deactivatedCount = 0;

    for (const policy of policies) {
      const source = this.getPolicySource(policy);
      const scope = this.evaluateMvpScopeForPolicy(policy, source);
      if (scope.inScope) {
        continue;
      }

      policy.status = PolicyStatus.INACTIVE;
      policy.extraMeta = {
        ...(policy.extraMeta ?? {}),
        pipeline: {
          ...((policy.extraMeta?.pipeline as Record<string, unknown>) ?? {}),
          mvpPrunedAt: new Date().toISOString(),
          mvpPruneReason: scope.reason,
        },
      };
      await this.policyRepository.save(policy);

      deactivatedCount += 1;
      deactivatedByReason[scope.reason] = (deactivatedByReason[scope.reason] ?? 0) + 1;
      if (sample.length < 20) {
        sample.push({
          id: policy.id,
          code: policy.code,
          title: policy.title,
          source,
          reason: scope.reason,
        });
      }
    }

    return {
      prunedAt: new Date().toISOString(),
      totalActiveBefore: policies.length,
      deactivatedCount,
      deactivatedByReason,
      sample,
    };
  }

  private getOrCreateSourceSummary(
    map: Map<string, SourceQualitySummary>,
    source: string,
  ): SourceQualitySummary {
    const found = map.get(source);
    if (found) {
      return found;
    }

    const created: SourceQualitySummary = {
      source,
      total: 0,
      inMvpScope: 0,
      outOfMvpScope: 0,
      missingApplicationUrl: 0,
      missingApplicationMethod: 0,
      missingBoth: 0,
    };
    map.set(source, created);
    return created;
  }

  private evaluateMvpScopeForPolicy(
    policy: Policy,
    source: string,
  ): { inScope: boolean; reason: string } {
    return evaluateMvpScope(source, policy.categories, policy.regionCodes);
  }

  private getPolicySource(policy: Policy): string {
    return getPolicySource(policy.extraMeta) ?? 'unknown';
  }
}
