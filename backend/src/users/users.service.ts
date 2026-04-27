import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { OAuthProvider } from '../common/enums/oauth-provider.enum';
import { OAuthAccount, User, UserProfile } from '../database/entities';
import { CompleteProfileInput } from './types/complete-profile-input.type';
import { CreateUserInput } from './types/create-user-input.type';
import { OAuthProfileInput } from './types/oauth-profile-input.type';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(OAuthAccount)
    private readonly oauthAccountRepository: Repository<OAuthAccount>,
  ) {}

  async createUser(input: CreateUserInput): Promise<{ user: User; profile: UserProfile }> {
    const existing = await this.userRepository.findOne({ where: { email: input.email } });
    if (existing) {
      // 이미 OAuth로 등록된 이메일이면 명확한 메시지로 안내
      if (!existing.passwordHash) {
        throw new ConflictException(
          '이미 OAuth로 가입된 이메일입니다. 동일한 OAuth 제공자로 로그인해주세요.',
        );
      }
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const { token, expiresAt } = this.createVerificationToken();

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        User,
        manager.create(User, {
          email: input.email,
          passwordHash,
          emailVerified: false,
          emailVerificationToken: token,
          emailVerificationExpiresAt: expiresAt,
          lastVerificationSentAt: new Date(),
        }),
      );

      const profile = await manager.save(
        UserProfile,
        manager.create(UserProfile, {
          userId: user.id,
          age: input.age,
          gender: input.gender,
          regionCode: input.regionCode,
          interests: input.interests,
        }),
      );

      return { user, profile };
    });
  }

  /** 이메일 인증 토큰 발급 — 새로 만들 때마다 기존 토큰은 폐기 */
  async issueVerificationToken(user: User): Promise<string> {
    const { token, expiresAt } = this.createVerificationToken();
    user.emailVerificationToken = token;
    user.emailVerificationExpiresAt = expiresAt;
    user.lastVerificationSentAt = new Date();
    await this.userRepository.save(user);
    return token;
  }

  async verifyEmailByToken(token: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });
    if (!user) {
      throw new NotFoundException('유효하지 않은 인증 링크입니다.');
    }
    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new ConflictException('인증 링크가 만료되었습니다. 재발송 후 다시 시도해주세요.');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    return this.userRepository.save(user);
  }

  /** OAuth 가입자의 자동 인증 처리 — provider가 이미 이메일을 검증했으므로 신뢰 */
  async markEmailVerified(user: User): Promise<User> {
    if (user.emailVerified) return user;
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    return this.userRepository.save(user);
  }

  private createVerificationToken(): { token: string; expiresAt: Date } {
    return {
      token: randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    };
  }

  /**
   * OAuth 로그인 시 호출. 우선순위:
   * 1. (provider, providerId) 매칭 → 기존 user 반환
   * 2. email 매칭 → 기존 user에 OAuth 계정 연결
   * 3. 둘 다 없음 → 신규 user 생성 (프로필은 미완성 상태)
   */
  async findOrCreateOAuthUser(input: OAuthProfileInput): Promise<User> {
    const linked = await this.oauthAccountRepository.findOne({
      where: { provider: input.provider, providerId: input.providerId },
      relations: ['user'],
    });
    if (linked?.user) {
      return linked.user;
    }

    const existing = await this.userRepository.findOne({ where: { email: input.email } });
    if (existing) {
      await this.linkOAuthAccount(existing.id, input.provider, input.providerId);
      return existing;
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.save(
        User,
        manager.create(User, {
          email: input.email,
          passwordHash: null,
          displayName: input.displayName ?? null,
        }),
      );

      await manager.save(
        OAuthAccount,
        manager.create(OAuthAccount, {
          userId: user.id,
          provider: input.provider,
          providerId: input.providerId,
        }),
      );

      return user;
    });
  }

  async linkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    providerId: string,
  ): Promise<void> {
    const exists = await this.oauthAccountRepository.findOne({
      where: { userId, provider },
    });
    if (exists) return;

    await this.oauthAccountRepository.save(
      this.oauthAccountRepository.create({ userId, provider, providerId }),
    );
  }

  async completeProfile(userId: string, input: CompleteProfileInput): Promise<UserProfile> {
    const existing = await this.profileRepository.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('이미 프로필이 등록된 사용자입니다.');
    }

    return this.profileRepository.save(
      this.profileRepository.create({
        userId,
        age: input.age,
        gender: input.gender,
        regionCode: input.regionCode,
        interests: input.interests,
      }),
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['profile'],
    });
  }

  async findById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
  }

  async findProfile(userId: string): Promise<UserProfile | null> {
    return this.profileRepository.findOne({ where: { userId } }) ?? null;
  }

  async findProfileOrFail(userId: string): Promise<UserProfile> {
    const profile = await this.findProfile(userId);
    if (!profile) {
      throw new NotFoundException('사용자 프로필을 찾을 수 없습니다.');
    }
    return profile;
  }
}
