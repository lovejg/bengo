import { Injectable } from '@nestjs/common';
import { NormalizedPolicyDocument } from './interfaces/normalized-policy.interface';

export interface PolicyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class PolicyValidationService {
  validate(policy: NormalizedPolicyDocument): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!policy.title) {
      errors.push('title 값이 필요합니다.');
    }

    if (!policy.description) {
      errors.push('description 값이 필요합니다.');
    }

    if (policy.minAge !== null && policy.maxAge !== null && policy.minAge > policy.maxAge) {
      [policy.minAge, policy.maxAge] = [policy.maxAge, policy.minAge];
    }

    if (!policy.sourceUrl) {
      warnings.push('sourceUrl 값이 비어 있습니다.');
    }

    if (!policy.applicationUrl && !policy.applicationMethod) {
      warnings.push('applicationUrl/applicationMethod 둘 다 비어 있습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
