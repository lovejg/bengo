import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthAccount, User, UserProfile } from '../database/entities';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile, OAuthAccount])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
