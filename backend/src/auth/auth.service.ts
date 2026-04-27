import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserProfile } from '../database/entities';
import { UsersService } from '../users/users.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { OAuthProfileInput } from '../users/types/oauth-profile-input.type';
import { EmailService } from '../email/email.service';

const RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async signup(input: SignupDto): Promise<AuthResponseDto> {
    const created = await this.usersService.createUser(input);
    await this.sendVerificationEmail(created.user);
    return this.buildAuthResponse(created.user, created.profile);
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    return this.buildAuthResponse(user, user.profile ?? null);
  }

  async loginWithOAuth(input: OAuthProfileInput): Promise<AuthResponseDto> {
    const user = await this.usersService.findOrCreateOAuthUser(input);
    // OAuth provider가 이미 이메일을 검증했으므로 자동 인증 처리
    await this.usersService.markEmailVerified(user);
    const profile = await this.usersService.findProfile(user.id);
    return this.buildAuthResponse(user, profile);
  }

  async completeProfile(userId: string, input: CompleteProfileDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const profile = await this.usersService.completeProfile(userId, input);
    return this.buildAuthResponse(user, profile);
  }

  async verifyEmail(token: string): Promise<void> {
    await this.usersService.verifyEmailByToken(token);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    // 사용자 존재 여부를 노출하지 않기 위해 동일하게 응답
    if (!user || user.emailVerified) return;

    if (user.lastVerificationSentAt) {
      const elapsed = Date.now() - user.lastVerificationSentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new BadRequestException(`${wait}초 후에 다시 시도해주세요.`);
      }
    }

    await this.sendVerificationEmail(user);
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    const token = await this.usersService.issueVerificationToken(user);
    const backendBaseUrl =
      this.configService.get<string>('BACKEND_BASE_URL') ?? 'http://localhost:4000';
    const verificationUrl = `${backendBaseUrl}/auth/verify-email?token=${token}`;

    try {
      await this.emailService.sendVerificationEmail(user.email, verificationUrl);
    } catch (error) {
      // 이메일 전송 실패해도 회원가입 자체는 성공시키고, 사용자가 재발송 요청 가능
      this.logger.warn(
        `Verification email send failed for ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private buildAuthResponse(user: User, profile: UserProfile | null): AuthResponseDto {
    const payload = { sub: user.id, email: user.email };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        profileCompleted: profile !== null,
        displayName: user.displayName ?? null,
        age: profile?.age ?? null,
        gender: profile?.gender ?? null,
        regionCode: profile?.regionCode ?? null,
        interests: profile?.interests ?? [],
      },
    };
  }
}
