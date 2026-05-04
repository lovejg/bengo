import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Fastify 환경에서 Passport 세션 직렬화를 비활성화 */
@Injectable()
export class NaverAuthGuard extends AuthGuard('naver') {
  getAuthenticateOptions() {
    return { session: false };
  }
}
