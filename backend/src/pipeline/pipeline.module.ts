import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PipelineIngestionRun,
  Policy,
  PolicyRequirement,
  PolicyRule,
  RawPolicyDocumentEntity,
} from '../database/entities';
import { DataGoKrCollector } from './collectors/data-go-kr.collector';
import { MockSeoulCollector } from './collectors/mock-seoul.collector';
import { SeoulOpenApiCollector } from './collectors/seoul-open-api.collector';
import { YouthcenterCenterCollector } from './collectors/youthcenter-center.collector';
import { YouthcenterPolicyCollector } from './collectors/youthcenter-policy.collector';
import { PipelineCollectionService } from './pipeline-collection.service';
import { PipelineController } from './pipeline.controller';
import { PipelineIngestionService } from './pipeline-ingestion.service';
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';
import { PipelineQualityService } from './pipeline-quality.service';
import { PolicyNormalizationService } from './policy-normalization.service';
import { PolicyRequirementGeneratorService } from './policy-requirement-generator.service';
import { PolicyValidationService } from './policy-validation.service';
import { LlmRuleExtractorService } from './llm-rule-extractor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RawPolicyDocumentEntity,
      PipelineIngestionRun,
      Policy,
      PolicyRequirement,
      PolicyRule,
    ]),
  ],
  controllers: [PipelineController],
  providers: [
    PipelineOrchestratorService,
    PipelineIngestionService,
    PipelineCollectionService,
    MockSeoulCollector,
    DataGoKrCollector,
    YouthcenterPolicyCollector,
    YouthcenterCenterCollector,
    SeoulOpenApiCollector,
    PolicyNormalizationService,
    PolicyValidationService,
    PolicyRequirementGeneratorService,
    LlmRuleExtractorService,
    PipelineQualityService,
  ],
  exports: [
    PipelineOrchestratorService,
    PipelineIngestionService,
    PipelineQualityService,
  ],
})
export class PipelineModule {}
