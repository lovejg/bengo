import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PreviewPipelineDto } from './dto/preview-pipeline.dto';
import { PipelineCollectionService } from './pipeline-collection.service';
import {
  IngestBatchResult,
  IngestOneResult,
  PipelineIngestionService,
} from './pipeline-ingestion.service';
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';
import {
  PipelinePruneReport,
  PipelineQualityReport,
  PipelineQualityService,
} from './pipeline-quality.service';
import { PolicyEnrichmentService } from './policy-enrichment.service';
import { PolicyRequirementGeneratorService } from './policy-requirement-generator.service';
import { PolicyUrlValidatorService, UrlValidationReport } from './policy-url-validator.service';

interface CollectAndIngestMvpResult {
  mode: 'mvp';
  targets: string[];
  skipped: Array<{
    source: string;
    reason: string;
  }>;
  failedCollections: Array<{
    source: string;
    message: string;
  }>;
  results: Array<{
    source: string;
    ingest: IngestBatchResult;
  }>;
  failedSources: Array<{
    source: string;
    message: string;
  }>;
}

@ApiTags('pipeline')
@Controller('pipeline')
export class PipelineController {
  constructor(
    private readonly orchestratorService: PipelineOrchestratorService,
    private readonly ingestionService: PipelineIngestionService,
    private readonly collectionService: PipelineCollectionService,
    private readonly qualityService: PipelineQualityService,
    private readonly enrichmentService: PolicyEnrichmentService,
    private readonly requirementGenerator: PolicyRequirementGeneratorService,
    private readonly urlValidator: PolicyUrlValidatorService,
  ) {}

  @Get('sources')
  @ApiOperation({ summary: '수집 가능한 소스 목록 조회' })
  @ApiOkResponse({ description: '수집 소스 목록' })
  listSources() {
    return this.collectionService.listSources();
  }

  @Get('quality-report')
  @ApiOperation({
    summary: '수집/정규화 데이터 품질 리포트',
    description:
      '소스별 적재 현황과 MVP 범위 적합도, 신청정보 누락 비율을 요약합니다.',
  })
  @ApiOkResponse({ description: '품질 리포트' })
  qualityReport(): Promise<PipelineQualityReport> {
    return this.qualityService.getQualityReport();
  }

  @Post('prune-mvp')
  @ApiOperation({
    summary: 'MVP 범위 밖 활성 정책 비활성화',
    description:
      '현재 활성 정책 중 MVP 범위 밖 정책을 INACTIVE로 변경해 목록 품질을 정리합니다.',
  })
  @ApiOkResponse({ description: '정리 결과' })
  pruneMvp(): Promise<PipelinePruneReport> {
    return this.qualityService.pruneOutOfMvpActivePolicies();
  }

  @Post('preview')
  @ApiOperation({
    summary: '수집 원문에 대한 정규화/검증 결과 프리뷰',
    description: '크롤링/공공API 원문이 정규화 스키마로 어떻게 변환되는지 확인합니다.',
  })
  @ApiOkResponse({ description: '정규화 및 검증 결과' })
  preview(@Body() dto: PreviewPipelineDto) {
    return this.orchestratorService.runPreview(dto);
  }

  @Post('ingest')
  @ApiOperation({
    summary: '수집 원문 단건 적재',
    description: '원문 저장 후 정규화/검증을 거쳐 policies 테이블에 업서트합니다.',
  })
  @ApiOkResponse({ description: '적재 결과' })
  ingest(@Body() dto: PreviewPipelineDto): Promise<IngestOneResult> {
    return this.ingestionService.ingestOne(dto);
  }

  @Post('collect-and-ingest-mvp')
  @ApiOperation({
    summary: 'MVP 대상 소스 일괄 수집/적재',
    description:
      'MVP 기본 소스(data.go.kr, 온통청년 정책, 서울 열린데이터) 중 설정 완료된 소스를 순차 실행합니다.',
  })
  @ApiOkResponse({ description: 'MVP 일괄 적재 결과' })
  async collectAndIngestMvp(): Promise<CollectAndIngestMvpResult> {
    const batch = await this.collectionService.collectMvpBatchSources();
    const results: Array<{ source: string; ingest: IngestBatchResult }> = [];
    const failedSources: Array<{ source: string; message: string }> = [];

    for (const item of batch.collected) {
      try {
        const ingest = await this.ingestionService.ingestBatch(item.items);
        results.push({
          source: item.source,
          ingest,
        });
      } catch (error) {
        failedSources.push({
          source: item.source,
          message: error instanceof Error ? error.message : '적재 중 알 수 없는 오류',
        });
      }
    }

    return {
      mode: 'mvp',
      targets: batch.targets,
      skipped: batch.skipped,
      failedCollections: batch.failedCollections ?? [],
      results,
      failedSources,
    };
  }

  @Post('enrich-policies')
  @ApiOperation({
    summary: '기존 정책 데이터 보강 (크롤링)',
    description:
      'sourceUrl이 있는 활성 정책의 상세 페이지를 크롤링하여 빈 필드(신청방법, 기간, 자격요건 등)를 보강합니다.',
  })
  @ApiOkResponse({ description: '보강 결과' })
  enrichPolicies() {
    return this.enrichmentService.enrichActivePolicies();
  }

  @Post('deactivate-expired')
  @ApiOperation({
    summary: '마감된 정책 비활성화',
    description: 'endsAt이 오늘 이전인 활성 정책을 INACTIVE로 변경합니다.',
  })
  @ApiOkResponse({ description: '비활성화 결과' })
  deactivateExpired() {
    return this.ingestionService.deactivateExpiredPolicies();
  }

  @Post('regenerate-rules')
  @ApiOperation({
    summary: '모든 활성 정책의 requirements/rules 재생성',
    description:
      '기본: 콘텐츠 해시 기반으로 변경된 정책만 LLM 재호출 (빠름). ' +
      '?force=true: 기존 rules/requirements 전부 삭제 후 전체 재생성 (LLM 프롬프트 수정 시 사용).',
  })
  @ApiOkResponse({ description: '재생성 결과' })
  async regenerateRules(@Query('force') force?: string) {
    return this.requirementGenerator.regenerateAll(force === 'true');
  }

  @Post('validate-urls')
  @ApiOperation({
    summary: '모든 활성 정책의 sourceUrl 유효성 검증',
    description: '404/410 응답이나 접근 불가 URL을 null로 초기화합니다.',
  })
  @ApiOkResponse({ description: 'URL 검증 결과' })
  async validateUrls(): Promise<UrlValidationReport> {
    return this.urlValidator.validateAll();
  }

  @Post('collect-and-ingest/:source')
  @ApiOperation({
    summary: '수집기 실행 후 배치 적재',
    description: '선택한 소스 어댑터로 원문을 수집한 뒤 일괄 적재합니다.',
  })
  @ApiOkResponse({ description: '배치 적재 결과' })
  async collectAndIngest(@Param('source') source: string): Promise<IngestBatchResult> {
    const collected = await this.collectionService.collect(source);
    return this.ingestionService.ingestBatch(collected);
  }
}
