import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  MVP_DEFAULT_BATCH_SOURCES,
  MVP_EXCLUDED_SOURCES,
} from '../common/constants/mvp-policy-scope.constant';
import { DataGoKrCollector } from './collectors/data-go-kr.collector';
import { MockSeoulCollector } from './collectors/mock-seoul.collector';
import { SeoulOpenApiCollector } from './collectors/seoul-open-api.collector';
import { YouthcenterCenterCollector } from './collectors/youthcenter-center.collector';
import { YouthcenterPolicyCollector } from './collectors/youthcenter-policy.collector';
import { YouthSeoulCollector } from './collectors/youth-seoul.collector';
import { PolicyCollector } from './interfaces/policy-collector.interface';
import { RawPolicyDocument } from './interfaces/raw-policy.interface';

export interface PipelineSourceInfo {
  source: string;
  description: string;
  configured: boolean;
  mvpEnabled: boolean;
  mvpReason: string | null;
}

export interface MvpBatchPlan {
  targets: string[];
  skipped: Array<{
    source: string;
    reason: string;
  }>;
  failedCollections?: Array<{
    source: string;
    message: string;
  }>;
}

export interface MvpCollectedSource {
  source: string;
  items: RawPolicyDocument[];
}

@Injectable()
export class PipelineCollectionService {
  private readonly logger = new Logger(PipelineCollectionService.name);
  private readonly collectors: PolicyCollector[];

  constructor(
    private readonly mockSeoulCollector: MockSeoulCollector,
    private readonly dataGoKrCollector: DataGoKrCollector,
    private readonly youthcenterPolicyCollector: YouthcenterPolicyCollector,
    private readonly youthcenterCenterCollector: YouthcenterCenterCollector,
    private readonly seoulOpenApiCollector: SeoulOpenApiCollector,
    private readonly youthSeoulCollector: YouthSeoulCollector,
  ) {
    this.collectors = [
      this.mockSeoulCollector,
      this.dataGoKrCollector,
      this.youthcenterPolicyCollector,
      this.youthcenterCenterCollector,
      this.seoulOpenApiCollector,
      this.youthSeoulCollector,
    ];
  }

  listSources(): PipelineSourceInfo[] {
    return this.collectors.map((collector) => {
      const configured = collector.isConfigured();
      const source = collector.sourceName;
      const isDefaultBatchSource = MVP_DEFAULT_BATCH_SOURCES.includes(
        source as (typeof MVP_DEFAULT_BATCH_SOURCES)[number],
      );
      const isExcludedSource = MVP_EXCLUDED_SOURCES.includes(source);

      let mvpReason: string | null = null;
      if (!isDefaultBatchSource) {
        mvpReason = 'MVP 기본 배치 대상 소스가 아닙니다.';
      } else if (isExcludedSource) {
        mvpReason = 'MVP 범위 제외 소스입니다.';
      } else if (!configured) {
        mvpReason = '환경 변수 미설정으로 수집 불가합니다.';
      }

      return {
        source,
        description: collector.description,
        configured,
        mvpEnabled: mvpReason === null,
        mvpReason,
      };
    });
  }

  getMvpBatchPlan(): MvpBatchPlan {
    const sources = this.listSources();
    const targets = sources
      .filter((source) => source.mvpEnabled)
      .map((source) => source.source);
    const skipped = sources
      .filter((source) => !source.mvpEnabled)
      .map((source) => ({
        source: source.source,
        reason: source.mvpReason ?? '제외됨',
      }));

    return {
      targets,
      skipped,
    };
  }

  async collect(source: string): Promise<RawPolicyDocument[]> {
    const collector = this.collectors.find((item) => item.sourceName === source);
    if (!collector) {
      throw new NotFoundException(`지원하지 않는 수집 소스입니다: ${source}`);
    }

    return collector.collect();
  }

  async collectMvpBatchSources(): Promise<MvpBatchPlan & { collected: MvpCollectedSource[] }> {
    const plan = this.getMvpBatchPlan();

    this.logger.log(`수집 시작 — 소스: ${plan.targets.join(', ')}`);
    const settlements = await Promise.allSettled(
      plan.targets.map(async (source) => {
        const items = await this.collect(source);
        this.logger.log(`[${source}] 수집 완료 — ${items.length}개`);
        return { source, items };
      }),
    );

    const collected: MvpCollectedSource[] = [];
    const failedCollections: Array<{ source: string; message: string }> = [];

    for (let i = 0; i < plan.targets.length; i++) {
      const result = settlements[i];
      const source = plan.targets[i];
      if (result.status === 'fulfilled') {
        collected.push(result.value);
      } else {
        const message = result.reason instanceof Error ? result.reason.message : '수집 중 알 수 없는 오류';
        this.logger.error(`[${source}] 수집 실패 — ${message}`);
        failedCollections.push({ source, message });
      }
    }

    return { ...plan, failedCollections, collected };
  }
}
