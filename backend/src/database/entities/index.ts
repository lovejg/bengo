import { EligibilityCheck } from './eligibility-check.entity';
import { OAuthAccount } from './oauth-account.entity';
import { PipelineIngestionRun } from './pipeline-ingestion-run.entity';
import { PolicyRequirement } from './policy-requirement.entity';
import { PolicyRule } from './policy-rule.entity';
import { Policy } from './policy.entity';
import { RawPolicyDocumentEntity } from './raw-policy-document.entity';
import { UserProfile } from './user-profile.entity';
import { UserPolicyState } from './user-policy-state.entity';
import { User } from './user.entity';

export const ENTITIES = [
  User,
  UserProfile,
  OAuthAccount,
  Policy,
  PolicyRequirement,
  PolicyRule,
  EligibilityCheck,
  UserPolicyState,
  RawPolicyDocumentEntity,
  PipelineIngestionRun,
];

export {
  EligibilityCheck,
  OAuthAccount,
  PipelineIngestionRun,
  Policy,
  PolicyRequirement,
  PolicyRule,
  RawPolicyDocumentEntity,
  User,
  UserPolicyState,
  UserProfile,
};
