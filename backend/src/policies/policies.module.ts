import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EligibilityCheck,
  Policy,
  PolicyRequirement,
  PolicyRule,
  UserPolicyState,
} from '../database/entities';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { UsersModule } from '../users/users.module';
import { PoliciesController } from './policies.controller';
import { PolicySeedService } from './policy-seed.service';
import { PoliciesService } from './policies.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Policy,
      PolicyRule,
      PolicyRequirement,
      EligibilityCheck,
      UserPolicyState,
    ]),
    UsersModule,
    EligibilityModule,
  ],
  controllers: [PoliciesController],
  providers: [PoliciesService, PolicySeedService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
