import { randomBytes } from 'crypto';
import { Body, Controller, Get, HttpCode, Patch, Post, Query, Redirect, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { NaverAuthGuard } from './guards/naver-auth.guard';
import { OAuthProfileInput } from '../users/types/oauth-profile-input.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: '일반 회원가입' })
  @ApiOkResponse({ type: AuthResponseDto })
  signup(@Body() dto: SignupDto): Promise<AuthResponseDto> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @ApiOperation({ summary: '일반 로그인' })
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('verify-email')
  @ApiOperation({ summary: '이메일 인증 링크 처리 (메일에서 클릭 시 호출)' })
  async verifyEmail(@Query('token') token: string, @Res() res: FastifyReply): Promise<void> {
    const frontendBase = this.configService.get<string>('FRONTEND_BASE_URL') ?? '';
    const buildResultUrl = (status: 'success' | 'expired' | 'invalid') =>
      frontendBase
        ? `${frontendBase.replace(/\/$/, '')}/email-verified?status=${status}`
        : null;

    // NestJS Fastify 어댑터가 핸들러 실행 전 기본 상태코드 200을 미리 설정해두기 때문에,
    // res.redirect(url)을 코드 없이 호출하면 Fastify가 기존 200을 유지함 (Location은 붙지만 200) → 명시적으로 302 전달.
    if (!token) {
      const url = buildResultUrl('invalid');
      if (url) return res.redirect(url, 302);
      res.code(400).send({ message: '토큰이 누락되었습니다.' });
      return;
    }

    try {
      await this.authService.verifyEmail(token);
      const url = buildResultUrl('success');
      if (url) return res.redirect(url, 302);
      res.send({ message: '이메일 인증이 완료되었습니다.' });
    } catch (error) {
      const isExpired = error instanceof Error && error.message.includes('만료');
      const url = buildResultUrl(isExpired ? 'expired' : 'invalid');
      if (url) return res.redirect(url, 302);
      res.code(400).send({ message: error instanceof Error ? error.message : '인증 실패' });
    }
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: '이메일 인증 메일 재발송 (60초 쿨다운)' })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<{ message: string }> {
    await this.authService.resendVerification(dto.email);
    return { message: '인증 메일을 발송했습니다. 메일함을 확인해주세요.' };
  }

  @Post('complete-profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'OAuth 가입자의 프로필 입력 완료' })
  @ApiOkResponse({ type: AuthResponseDto })
  completeProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: CompleteProfileDto,
  ): Promise<AuthResponseDto> {
    return this.authService.completeProfile(user.sub, dto);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '프로필 부분 수정',
    description: '전달된 필드만 업데이트. age/gender/regionCode/interests는 UserProfile, displayName은 User. 이메일/비밀번호는 별도 엔드포인트.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  updateProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthResponseDto> {
    return this.authService.updateProfile(user.sub, dto);
  }

  @Post('change-password')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '비밀번호 변경 (일반 가입자 전용)' })
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('delete-account')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '회원 탈퇴',
    description: '일반 가입자는 password 필수, OAuth 전용 가입자는 password 생략 가능. cascade로 관련 데이터 모두 삭제.',
  })
  async deleteAccount(
    @CurrentUser() user: JwtUser,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    await this.authService.deleteAccount(user.sub, dto.password);
  }

  @Get('google')
  @Redirect()
  @ApiOperation({ summary: 'Google OAuth 시작 (브라우저 redirect)' })
  googleLogin(): { url: string; statusCode: number } {
    const params = new URLSearchParams({
      client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '',
      redirect_uri: this.configService.get<string>('GOOGLE_CALLBACK_URL') ?? '',
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      statusCode: 302,
    };
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @Redirect()
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: FastifyRequest): Promise<{ url: string; statusCode: number }> {
    return this.buildOAuthRedirect(req);
  }

  @Get('naver')
  @Redirect()
  @ApiOperation({ summary: 'Naver OAuth 시작 (브라우저 redirect)' })
  naverLogin(): { url: string; statusCode: number } {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.configService.get<string>('NAVER_CLIENT_ID') ?? '',
      redirect_uri: this.configService.get<string>('NAVER_CALLBACK_URL') ?? '',
      state: randomBytes(16).toString('hex'),
    });
    return {
      url: `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`,
      statusCode: 302,
    };
  }

  @Get('naver/callback')
  @UseGuards(NaverAuthGuard)
  @Redirect()
  @ApiOperation({ summary: 'Naver OAuth callback' })
  async naverCallback(@Req() req: FastifyRequest): Promise<{ url: string; statusCode: number }> {
    return this.buildOAuthRedirect(req);
  }

  private async buildOAuthRedirect(
    req: FastifyRequest,
  ): Promise<{ url: string; statusCode: number }> {
    const oauthProfile = (req as unknown as { user: OAuthProfileInput }).user;
    const auth = await this.authService.loginWithOAuth(oauthProfile);

    const redirectBase = this.configService.get<string>('FRONTEND_OAUTH_REDIRECT_URL');
    if (!redirectBase) {
      throw new Error('FRONTEND_OAUTH_REDIRECT_URL이 설정되지 않았습니다.');
    }

    const url = new URL(redirectBase);
    url.searchParams.set('token', auth.accessToken);
    url.searchParams.set('profileCompleted', String(auth.user.profileCompleted));
    return { url: url.toString(), statusCode: 302 };
  }
}
