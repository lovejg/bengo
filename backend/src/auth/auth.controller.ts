import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { SignupDto } from './dto/signup.dto';
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

    if (!token) {
      const url = buildResultUrl('invalid');
      if (url) return res.redirect(url);
      res.code(400).send({ message: '토큰이 누락되었습니다.' });
      return;
    }

    try {
      await this.authService.verifyEmail(token);
      const url = buildResultUrl('success');
      if (url) return res.redirect(url);
      res.send({ message: '이메일 인증이 완료되었습니다.' });
    } catch (error) {
      const isExpired = error instanceof Error && error.message.includes('만료');
      const url = buildResultUrl(isExpired ? 'expired' : 'invalid');
      if (url) return res.redirect(url);
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

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth 시작 (브라우저 redirect)' })
  googleLogin(): void {
    // Passport가 Google authorize URL로 redirect 처리
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: FastifyRequest, @Res() res: FastifyReply): Promise<void> {
    await this.handleOAuthCallback(req, res);
  }

  @Get('naver')
  @UseGuards(NaverAuthGuard)
  @ApiOperation({ summary: 'Naver OAuth 시작 (브라우저 redirect)' })
  naverLogin(): void {
    // Passport가 Naver authorize URL로 redirect 처리
  }

  @Get('naver/callback')
  @UseGuards(NaverAuthGuard)
  @ApiOperation({ summary: 'Naver OAuth callback' })
  async naverCallback(@Req() req: FastifyRequest, @Res() res: FastifyReply): Promise<void> {
    await this.handleOAuthCallback(req, res);
  }

  private async handleOAuthCallback(req: FastifyRequest, res: FastifyReply): Promise<void> {
    const oauthProfile = (req as unknown as { user: OAuthProfileInput }).user;
    const auth = await this.authService.loginWithOAuth(oauthProfile);

    const redirectBase = this.configService.get<string>('FRONTEND_OAUTH_REDIRECT_URL');
    if (!redirectBase) {
      // 프론트 redirect URL이 설정되지 않은 경우 JSON으로 직접 반환
      res.send(auth);
      return;
    }

    const url = new URL(redirectBase);
    url.searchParams.set('token', auth.accessToken);
    url.searchParams.set('profileCompleted', String(auth.user.profileCompleted));
    res.redirect(url.toString());
  }
}
