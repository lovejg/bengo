import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './config/redis.module';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { PoliciesModule } from './policies/policies.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    RedisModule,
    UsersModule,
    AuthModule,
    PoliciesModule,
    EligibilityModule,
    PipelineModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
