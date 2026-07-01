import { Injectable } from '@nestjs/common';
import { RawPolicyDocument } from './interfaces/raw-policy.interface';
import { PolicyNormalizationService } from './policy-normalization.service';
import { PolicyValidationService } from './policy-validation.service';

@Injectable()
export class PipelineOrchestratorService {
  constructor(
    private readonly normalizationService: PolicyNormalizationService,
    private readonly validationService: PolicyValidationService,
  ) {}

  runPreview(raw: RawPolicyDocument) {
    const normalizedResult = this.normalizationService.normalize(raw);
    const validation = this.validationService.validate(normalizedResult.normalized);

    return {
      raw,
      normalized: normalizedResult.normalized,
      normalizationMeta: {
        confidence: normalizedResult.confidence,
        usedLlmFallback: normalizedResult.usedLlmFallback,
      },
      validation,
    };
  }
}
