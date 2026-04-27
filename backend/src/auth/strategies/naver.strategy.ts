import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-naver-v2';
import { OAuthProvider } from '../../common/enums/oauth-provider.enum';
import { OAuthProfileInput } from '../../users/types/oauth-profile-input.type';

type NaverVerifyDone = (error: Error | null, user?: OAuthProfileInput | false) => void;

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get<string>('NAVER_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('NAVER_CLIENT_SECRET') ?? '',
      callbackURL: configService.get<string>('NAVER_CALLBACK_URL') ?? '',
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: NaverVerifyDone,
  ): void {
    if (!profile.email) {
      return done(
        new UnauthorizedException(
          'Naver 계정에서 이메일을 받지 못했습니다. 권한 동의 항목을 확인해주세요.',
        ),
        false,
      );
    }

    const result: OAuthProfileInput = {
      provider: OAuthProvider.NAVER,
      providerId: profile.id,
      email: profile.email,
      displayName: profile.nickname ?? profile.name,
    };
    done(null, result);
  }
}
